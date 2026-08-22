import { Router } from 'express';
import * as reviewController from './reviews.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Public Endpoints (No authentication required)
router.get('/public', reviewController.getAllReviews);
router.get('/public/reviews', reviewController.getAllReviews);
router.get('/', reviewController.getAllReviews);
router.get('/:id', reviewController.getReviewById);

// Protected Admin Endpoints
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.patch('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

export { router as reviewRoutes };
export default router;
