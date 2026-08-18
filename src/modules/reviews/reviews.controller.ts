import { Request, Response, NextFunction } from 'express';
import * as reviewService from './reviews.service';

export const getAllReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await reviewService.getAllReviews();
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const review = await reviewService.getReviewById(id);

    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, description, profileUrl, starCount } = req.body;

    if (!name || !description) {
      res.status(400).json({
        success: false,
        message: 'name and description are required fields',
      });
      return;
    }

    let parsedStar = 5;
    if (starCount !== undefined && starCount !== null) {
      const num = Number(starCount);
      if (isNaN(num) || num < 0 || num > 5) {
        res.status(400).json({
          success: false,
          message: 'starCount must be a number between 0 and 5',
        });
        return;
      }
      parsedStar = num;
    }

    const review = await reviewService.createReview({
      name,
      role,
      description,
      profileUrl,
      starCount: parsedStar,
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, role, description, profileUrl, starCount } = req.body;

    // Check if review exists
    const existing = await reviewService.getReviewById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    let parsedStar: number | undefined = undefined;
    if (starCount !== undefined && starCount !== null) {
      const num = Number(starCount);
      if (isNaN(num) || num < 0 || num > 5) {
        res.status(400).json({
          success: false,
          message: 'starCount must be a number between 0 and 5',
        });
        return;
      }
      parsedStar = num;
    }

    const updated = await reviewService.updateReview(id, {
      name,
      role,
      description,
      profileUrl,
      starCount: parsedStar,
    });

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Check if review exists
    const existing = await reviewService.getReviewById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    await reviewService.deleteReview(id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
