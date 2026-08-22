import { Router } from 'express';
import { homeSectionProductsController } from './homeSectionProducts.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Protect all home section product endpoints
router.use(authenticate);

// Protected Endpoints
router.get('/', homeSectionProductsController.getAll);
router.get('/section/:homeSectionId', homeSectionProductsController.getBySectionId);
router.get('/:id', homeSectionProductsController.getById);
router.post('/', homeSectionProductsController.create);
router.put('/:id', homeSectionProductsController.update);
router.patch('/:id', homeSectionProductsController.update);
router.delete('/:id', homeSectionProductsController.delete);

export { router as homeSectionProductRoutes };
export default router;
