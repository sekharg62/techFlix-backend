import { Router } from 'express';
import { heroSlidesController } from './heroSlides.controller';
import { imageUpload } from '../../middlewares/imageUpload.middleware';

const router = Router();

// Public / Read
router.get('/', heroSlidesController.getAll);
router.get('/:id', heroSlidesController.getById);

// Admin / Manage
const slideImage = imageUpload({ urlField: 'imageUrl', folder: 'techflix/hero-slides', jsonFields: ['order'] });

router.post('/', slideImage, heroSlidesController.create);
router.put('/:id', slideImage, heroSlidesController.update);
router.delete('/:id', heroSlidesController.delete);

export default router;
