import { Router } from 'express';
import { homeSectionsController } from './homeSections.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Public: sections with their products for the storefront home page
router.get('/public', homeSectionsController.getPublic);

// Protect all other home section endpoints
router.use(authenticate);

// CRUD Endpoints
router.get('/', homeSectionsController.getAll);
router.get('/:id', homeSectionsController.getById);
router.post('/', homeSectionsController.create);
router.put('/:id', homeSectionsController.update);
router.patch('/:id', homeSectionsController.update);
router.delete('/:id', homeSectionsController.delete);

// Product association endpoints
router.post('/:id/products', homeSectionsController.addProduct);
router.delete('/:id/products/:productId', homeSectionsController.removeProduct);

export { router as homeSectionRoutes };
export default router;
