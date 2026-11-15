import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { asyncHandler, badRequest } from '../../utils/http';
import { ordersService } from './orders.service';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const ordersController = {
  // ── Public ────────────────────────────────────
  checkout: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.checkout(req.body || {});
    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Your payment is being verified.',
      data: order,
    });
  }),

  track: asyncHandler(async (req: Request, res: Response) => {
    const orderNumber = str(req.query.orderNumber);
    const email = str(req.query.email);
    if (!orderNumber || !email) throw badRequest('orderNumber and email are required');
    const order = await ordersService.track(orderNumber, email);
    res.status(200).json({ success: true, data: order });
  }),

  resubmitPayment: asyncHandler(async (req: Request, res: Response) => {
    const email = str(req.body?.email);
    if (!email) throw badRequest('email is required');
    const order = await ordersService.resubmitPayment(req.params.orderNumber as string, email, req.body?.payment);
    res.status(201).json({ success: true, message: 'Payment submitted for verification', data: order });
  }),

  // ── Admin ─────────────────────────────────────
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersService.list(req.query as Record<string, unknown>);
    res.status(200).json({
      success: true,
      data: result.orders,
      statusCounts: result.statusCounts,
      pagination: result.pagination,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.getById(req.params.id as string);
    res.status(200).json({ success: true, data: order });
  }),

  updateStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await ordersService.updateStatus(
      req.params.id as string,
      req.body?.status,
      req.body?.note,
      req.user?.id
    );
    res.status(200).json({ success: true, message: 'Order status updated', data: order });
  }),

  updateNote: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.updateAdminNote(req.params.id as string, req.body?.adminNote);
    res.status(200).json({ success: true, message: 'Order note updated', data: order });
  }),

  deliverItem: asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await ordersService.deliverItem(
      req.params.id as string,
      req.params.itemId as string,
      req.body?.deliveryDetails,
      req.user?.id
    );
    res.status(200).json({ success: true, message: 'Item delivered', data: order });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await ordersService.delete(req.params.id as string);
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  }),
};
