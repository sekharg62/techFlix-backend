import { Router } from 'express';
import { categoriesController } from './categories.controller';

const router = Router();

// Public / Read Endpoints
router.get('/', categoriesController.getAll);
router.get('/summary', categoriesController.getSummary);
router.get('/counts', categoriesController.getSummary);
router.get('/:id', categoriesController.getById);

// Create, Update, Delete Endpoints
router.post('/', categoriesController.create);
router.put('/:id', categoriesController.update);
router.patch('/:id', categoriesController.update);
router.delete('/:id', categoriesController.delete);

export { router as categoryRoutes };
export default router;
