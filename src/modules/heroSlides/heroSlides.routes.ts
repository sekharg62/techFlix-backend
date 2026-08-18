import { Router } from 'express';
import { heroSlidesController } from './heroSlides.controller';

const router = Router();

// Public / Read
router.get('/', heroSlidesController.getAll);
router.get('/:id', heroSlidesController.getById);

// Admin / Manage
router.post('/', heroSlidesController.create);
router.put('/:id', heroSlidesController.update);
router.delete('/:id', heroSlidesController.delete);

export default router;
