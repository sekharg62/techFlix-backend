import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { authenticate } from '../../middlewares/auth.middleware';
import { asyncHandler, badRequest, notFound, paginationMeta, parsePagination } from '../../utils/http';

const router = Router();
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

/** Total paid amount and order count per customer. */
const customerStats = async (customerIds: string[]) => {
  if (customerIds.length === 0) return new Map<string, { orderCount: number; totalSpent: number }>();
  const [counts, spent] = await Promise.all([
    prisma.order.groupBy({ by: ['customerId'], where: { customerId: { in: customerIds } }, _count: { _all: true } }),
    prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, paymentStatus: 'PAID' },
      _sum: { total: true },
    }),
  ]);
  const map = new Map<string, { orderCount: number; totalSpent: number }>();
  customerIds.forEach((id) => map.set(id, { orderCount: 0, totalSpent: 0 }));
  counts.forEach((c) => (map.get(c.customerId)!.orderCount = c._count._all));
  spent.forEach((s) => (map.get(s.customerId)!.totalSpent = s._sum.total?.toNumber() ?? 0));
  return map;
};

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const where: Prisma.CustomerWhereInput = {};
    const search = str(req.query.search);
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: req.query.sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
    ]);
    const stats = await customerStats(customers.map((c) => c.id));

    res.status(200).json({
      success: true,
      data: customers.map((c) => ({ ...c, ...stats.get(c.id) })),
      pagination: paginationMeta(total, page, limit),
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id as string },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: { select: { productName: true, variantName: true, planName: true, quantity: true } } },
        },
      },
    });
    if (!customer) throw notFound('Customer not found');
    const stats = await customerStats([customer.id]);
    res.status(200).json({ success: true, data: { ...customer, ...stats.get(customer.id) } });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, whatsapp, country } = req.body || {};
    const data: Prisma.CustomerUpdateInput = {};
    if (fullName !== undefined) {
      if (!str(fullName)) throw badRequest('fullName must be a non-empty string');
      data.fullName = str(fullName);
    }
    if (email !== undefined) {
      if (!EMAIL_RE.test(str(email))) throw badRequest('email must be valid');
      data.email = str(email).toLowerCase();
    }
    if (whatsapp !== undefined) {
      const phone = str(whatsapp).replace(/[\s-]/g, '');
      if (!PHONE_RE.test(phone)) throw badRequest('whatsapp must be a valid phone number');
      data.whatsapp = phone;
    }
    if (country !== undefined) data.country = str(country) || null;

    const customer = await prisma.customer.update({ where: { id: req.params.id as string }, data });
    res.status(200).json({ success: true, message: 'Customer updated', data: customer });
  })
);

export { router as customerRoutes };
export default router;
