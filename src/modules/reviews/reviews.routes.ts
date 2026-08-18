import { Router } from 'express';
import * as reviewController from './reviews.controller';

const router = Router();

// Public / Admin Endpoints
router.get('/', reviewController.getAllReviews);
router.get('/:id', reviewController.getReviewById);
router.post('/', reviewController.createReview);
router.put('/:id', reviewController.updateReview);
router.patch('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);

export { router as reviewRoutes };
