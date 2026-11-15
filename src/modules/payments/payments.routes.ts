import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/http';
import { paymentsService } from './payments.service';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentsService.list(req.query as Record<string, unknown>);
    res.status(200).json({ success: true, data: result.payments, pagination: result.pagination });
  })
);

router.patch(
  '/:id/verify',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await paymentsService.verify(req.params.id as string, req.user?.id);
    res.status(200).json({ success: true, message: 'Payment verified', data: order });
  })
);

router.patch(
  '/:id/reject',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await paymentsService.reject(req.params.id as string, req.body?.reason, req.user?.id);
    res.status(200).json({ success: true, message: 'Payment rejected', data: order });
  })
);

export { router as paymentRoutes };
export default router;
