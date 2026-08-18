import { Request, Response } from 'express';
import { heroSlidesService } from './heroSlides.service';

export const heroSlidesController = {
  getAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      const slides = await heroSlidesService.getAllSlides();
      res.status(200).json({
        success: true,
        count: slides.length,
        data: slides,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch hero slides',
      });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const slide = await heroSlidesService.getSlideById(id);

      if (!slide) {
        res.status(404).json({
          success: false,
          message: 'Hero slide not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: slide,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch hero slide',
      });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { order, imageUrl } = req.body;

      if (order === undefined || typeof order !== 'number' || order < 0) {
        res.status(400).json({
          success: false,
          message: 'order is required and must be a non-negative integer',
        });
        return;
      }

      if (!imageUrl || typeof imageUrl !== 'string') {
        res.status(400).json({
          success: false,
          message: 'imageUrl is required and must be a valid URL string',
        });
        return;
      }

      const newSlide = await heroSlidesService.createSlide({ order, imageUrl });
      res.status(201).json({
        success: true,
        message: 'Hero slide created successfully',
        data: newSlide,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already exists');
      res.status(isConflict ? 409 : 500).json({
        success: false,
        message: error.message || 'Failed to create hero slide',
      });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { order, imageUrl } = req.body;

      if (order !== undefined && (typeof order !== 'number' || order < 0)) {
        res.status(400).json({
          success: false,
          message: 'order must be a non-negative integer',
        });
        return;
      }

      const updated = await heroSlidesService.updateSlide(id, { order, imageUrl });
      res.status(200).json({
        success: true,
        message: 'Hero slide updated successfully',
        data: updated,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already exists');
      res.status(isConflict ? 409 : 500).json({
        success: false,
        message: error.message || 'Failed to update hero slide',
      });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await heroSlidesService.deleteSlide(id);
      res.status(200).json({
        success: true,
        message: 'Hero slide deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete hero slide',
      });
    }
  },
};
