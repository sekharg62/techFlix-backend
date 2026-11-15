import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Public endpoints (storefront)
router.post('/checkout', ordersController.checkout);
router.get('/track', ordersController.track);
router.post('/track/:orderNumber/payments', ordersController.resubmitPayment);

// Admin endpoints
router.use(authenticate);

router.get('/', ordersController.list);
router.get('/:id', ordersController.getById);
router.patch('/:id/status', ordersController.updateStatus);
router.patch('/:id/note', ordersController.updateNote);
router.patch('/:id/items/:itemId/deliver', ordersController.deliverItem);
router.delete('/:id', ordersController.delete);

export { router as orderRoutes };
export default router;
