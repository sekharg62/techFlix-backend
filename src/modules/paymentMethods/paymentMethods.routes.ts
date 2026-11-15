import { Router, Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { authenticate } from '../../middlewares/auth.middleware';
import { asyncHandler, badRequest, notFound } from '../../utils/http';
import { parsePaymentMethod } from '../orders/orders.service';

const router = Router();
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// Public: active receiving accounts for the checkout page
router.get(
  '/public',
  asyncHandler(async (_req: Request, res: Response) => {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { method: 'asc' },
      select: { method: true, accountNumber: true, accountType: true, instructions: true },
    });
    res.status(200).json({ success: true, data: methods });
  })
);

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const methods = await prisma.paymentMethod.findMany({ orderBy: { method: 'asc' } });
    res.status(200).json({ success: true, data: methods });
  })
);

// Create or update the account for one method (BKASH / NAGAD / ROCKET)
router.put(
  '/:method',
  asyncHandler(async (req: Request, res: Response) => {
    const method = parsePaymentMethod(req.params.method);
    const { accountNumber, accountType, instructions, isActive } = req.body || {};
    const number = str(accountNumber).replace(/[\s-]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(number)) throw badRequest('accountNumber must be a valid phone number');

    const data = {
      accountNumber: number,
      accountType: str(accountType) || 'Personal',
      instructions: str(instructions) || null,
      isActive: isActive === undefined ? true : Boolean(isActive),
    };
    const saved = await prisma.paymentMethod.upsert({
      where: { method },
      update: data,
      create: { method, ...data },
    });
    res.status(200).json({ success: true, message: 'Payment method saved', data: saved });
  })
);

router.delete(
  '/:method',
  asyncHandler(async (req: Request, res: Response) => {
    const method = parsePaymentMethod(req.params.method);
    const existing = await prisma.paymentMethod.findUnique({ where: { method } });
    if (!existing) throw notFound('Payment method not found');
    await prisma.paymentMethod.delete({ where: { method } });
    res.status(200).json({ success: true, message: 'Payment method deleted' });
  })
);

export { router as paymentMethodRoutes };
export default router;
