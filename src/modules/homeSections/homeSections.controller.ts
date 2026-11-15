import { Request, Response } from 'express';
import { homeSectionsService } from './homeSections.service';

export const homeSectionsController = {
  getPublic: async (_req: Request, res: Response): Promise<void> => {
    try {
      const sections = await homeSectionsService.getPublicHomeSections();
      res.status(200).json({ success: true, count: sections.length, data: sections });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch home sections' });
    }
  },

  getAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      const sections = await homeSectionsService.getAllHomeSections();
      res.status(200).json({
        success: true,
        count: sections.length,
        data: sections,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch home sections',
      });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const section = await homeSectionsService.getHomeSectionById(id);

      if (!section) {
        res.status(404).json({
          success: false,
          message: 'Home section not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: section,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch home section',
      });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, desc, tag, productIds } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'title is required and must be a non-empty string',
        });
        return;
      }

      if (!desc || typeof desc !== 'string' || desc.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'desc is required and must be a non-empty string',
        });
        return;
      }

      if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'tag is required and must be a non-empty string',
        });
        return;
      }

      if (productIds !== undefined && !Array.isArray(productIds)) {
        res.status(400).json({
          success: false,
          message: 'productIds must be an array of strings if provided',
        });
        return;
      }

      const section = await homeSectionsService.createHomeSection({
        title,
        desc,
        tag,
        productIds,
      });

      res.status(201).json({
        success: true,
        message: 'Home section created successfully',
        data: section,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create home section',
      });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { title, desc, tag, productIds } = req.body;

      const existing = await homeSectionsService.getHomeSectionById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Home section not found',
        });
        return;
      }

      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'title must be a non-empty string if provided',
        });
        return;
      }

      if (desc !== undefined && (typeof desc !== 'string' || desc.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'desc must be a non-empty string if provided',
        });
        return;
      }

      if (tag !== undefined && (typeof tag !== 'string' || tag.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'tag must be a non-empty string if provided',
        });
        return;
      }

      if (productIds !== undefined && !Array.isArray(productIds)) {
        res.status(400).json({
          success: false,
          message: 'productIds must be an array of strings if provided',
        });
        return;
      }

      const updated = await homeSectionsService.updateHomeSection(id, {
        title,
        desc,
        tag,
        productIds,
      });

      res.status(200).json({
        success: true,
        message: 'Home section updated successfully',
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update home section',
      });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      const existing = await homeSectionsService.getHomeSectionById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Home section not found',
        });
        return;
      }

      await homeSectionsService.deleteHomeSection(id);

      res.status(200).json({
        success: true,
        message: 'Home section deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete home section',
      });
    }
  },

  addProduct: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { productId } = req.body;

      if (!productId || typeof productId !== 'string') {
        res.status(400).json({
          success: false,
          message: 'productId is required and must be a string',
        });
        return;
      }

      const existing = await homeSectionsService.getHomeSectionById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Home section not found',
        });
        return;
      }

      const result = await homeSectionsService.addProductToSection(id, productId);

      res.status(201).json({
        success: true,
        message: 'Product added to home section successfully',
        data: result,
      });
    } catch (error: any) {
      const isConflict = error.code === 'P2002' || error.message?.includes('already exists');
      res.status(isConflict ? 409 : 500).json({
        success: false,
        message: isConflict ? 'Product is already added to this home section' : error.message || 'Failed to add product',
      });
    }
  },

  removeProduct: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, productId } = req.params;

      await homeSectionsService.removeProductFromSection(id as string, productId as string);

      res.status(200).json({
        success: true,
        message: 'Product removed from home section successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove product from home section',
      });
    }
  },
};
