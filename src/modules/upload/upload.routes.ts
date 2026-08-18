import { Router } from 'express';
import { uploadImage } from './upload.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Endpoint for image upload
router.post('/upload-image', upload.single('image'), uploadImage);

export { router as uploadRoutes };
