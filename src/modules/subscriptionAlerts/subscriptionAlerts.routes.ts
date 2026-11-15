import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { authenticate } from '../../middlewares/auth.middleware';
import { asyncHandler, badRequest } from '../../utils/http';

/**
 * Subscription alerts: delivered order items whose plan ends soon.
 * Every query filters on the indexed OrderItem.expiresAt (deliveredAt + planDurationDays),
 * so the page stays fast no matter how many orders exist.
 */
const router = Router();
router.use(authenticate);

const DAY = 86_400_000;
/** Expired items older than this are not listed (keeps the page about actionable renewals). */
const EXPIRED_LOOKBACK_DAYS = 30;

/** Bucket key → expiresAt range relative to now. Upcoming buckets are cumulative ("within N days"). */
const bucketRange = (bucket: string, now: number): { gte: Date; lt: Date } => {
  if (bucket === 'expired') return { gte: new Date(now - EXPIRED_LOOKBACK_DAYS * DAY), lt: new Date(now) };
  const days = Number(bucket);
  if (![1, 3, 5, 7, 15, 30].includes(days)) throw badRequest('bucket must be one of: expired, 1, 3, 5, 7, 15, 30');
  return { gte: new Date(now), lt: new Date(now + days * DAY) };
};

/** Items of orders that are still active (cancelled/refunded orders never need a renewal reminder). */
const activeOrder: Prisma.OrderItemWhereInput = { order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } };

router.get(
  '/summary',
  asyncHandler(async (_req: Request, res: Response) => {
    const now = Date.now();
    const at = (days: number) => new Date(now + days * DAY);
    // One round-trip: a single index range scan on expiresAt, bucketed with FILTER.
    const [row] = await prisma.$queryRaw<Record<string, bigint>[]>`
      SELECT
        COUNT(*) FILTER (WHERE oi."expiresAt" <  ${at(0)})  AS "expired",
        COUNT(*) FILTER (WHERE oi."expiresAt" >= ${at(0)} AND oi."expiresAt" < ${at(1)})  AS "1",
        COUNT(*) FILTER (WHERE oi."expiresAt" >= ${at(0)} AND oi."expiresAt" < ${at(3)})  AS "3",
        COUNT(*) FILTER (WHERE oi."expiresAt" >= ${at(0)} AND oi."expiresAt" < ${at(5)})  AS "5",
        COUNT(*) FILTER (WHERE oi."expiresAt" >= ${at(0)} AND oi."expiresAt" < ${at(7)})  AS "7",
        COUNT(*) FILTER (WHERE oi."expiresAt" >= ${at(0)} AND oi."expiresAt" < ${at(15)}) AS "15",
        COUNT(*) FILTER (WHERE oi."expiresAt" >= ${at(0)} AND oi."expiresAt" < ${at(30)}) AS "30"
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      WHERE oi."expiresAt" >= ${at(-EXPIRED_LOOKBACK_DAYS)}
        AND oi."expiresAt" <  ${at(30)}
        AND o."status" NOT IN ('CANCELLED', 'REFUNDED')`;
    const data = Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v)]));
    res.json({ success: true, data });
  })
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const now = Date.now();
    const bucket = String(req.query.bucket || '5');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || '').trim();

    const where: Prisma.OrderItemWhereInput = {
      ...activeOrder,
      expiresAt: bucketRange(bucket, now),
      ...(search && {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
          { order: { customerName: { contains: search, mode: 'insensitive' } } },
          { order: { customerEmail: { contains: search, mode: 'insensitive' } } },
          { order: { customerPhone: { contains: search } } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.orderItem.count({ where }),
      prisma.orderItem.findMany({
        where,
        // Soonest first; for expired, most recently expired first.
        orderBy: { expiresAt: bucket === 'expired' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          productName: true,
          productSlug: true,
          variantName: true,
          planName: true,
          planDurationDays: true,
          quantity: true,
          deliveredAt: true,
          expiresAt: true,
          order: {
            select: { id: true, orderNumber: true, customerName: true, customerEmail: true, customerPhone: true },
          },
        },
      }),
    ]);

    const data = items.map((item) => ({
      ...item,
      // Whole days left, rounded up: 0.2 days left → 1 ("1 day left"); negative = days since expiry.
      daysLeft: item.expiresAt ? Math.ceil((item.expiresAt.getTime() - now) / DAY) : null,
    }));
    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  })
);

export { router as subscriptionAlertRoutes };
export default router;
