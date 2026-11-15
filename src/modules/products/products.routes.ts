import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { imageUpload } from '../../middlewares/imageUpload.middleware';

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
const productImage = imageUpload({ urlField: 'imgUrl', folder: 'techflix/products', jsonFields: ['type', 'plans', 'features', 'stock'] });

router.post('/', productImage, productsController.create);
router.put('/:id', productImage, productsController.update);
router.patch('/:id', productImage, productsController.update);
router.delete('/:id', productsController.delete);

export { router as productRoutes };
export default router;
