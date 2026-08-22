import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Public endpoints (No authentication required)
router.get('/public', productsController.getPublic);
router.get('/public/products', productsController.getPublic);
router.get('/public/product/:slug', productsController.getBySlug);
router.get('/public/:slug', productsController.getBySlug);

// Protect all product management endpoints
router.use(authenticate);

// Protected endpoints
router.get('/', productsController.getAll);
router.get('/:id', productsController.getById);
router.post('/', productsController.create);
router.put('/:id', productsController.update);
router.patch('/:id', productsController.update);
router.delete('/:id', productsController.delete);

export { router as productRoutes };
export default router;
