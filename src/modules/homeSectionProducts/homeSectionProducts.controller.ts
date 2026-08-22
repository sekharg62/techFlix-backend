import { Request, Response } from 'express';
import { homeSectionProductsService } from './homeSectionProducts.service';

export const homeSectionProductsController = {
  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const { homeSectionId, productId } = req.query;

      const items = await homeSectionProductsService.getAll({
        homeSectionId: typeof homeSectionId === 'string' ? homeSectionId : undefined,
        productId: typeof productId === 'string' ? productId : undefined,
      });

      res.status(200).json({
        success: true,
        count: items.length,
        data: items,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch home section products',
      });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const item = await homeSectionProductsService.getById(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Home section product record not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch home section product',
      });
    }
  },

  getBySectionId: async (req: Request, res: Response): Promise<void> => {
    try {
      const homeSectionId = req.params.homeSectionId as string;
      const items = await homeSectionProductsService.getBySectionId(homeSectionId);

      res.status(200).json({
        success: true,
        count: items.length,
        data: items,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch products for this home section',
      });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { homeSectionId, productId } = req.body;

      if (!homeSectionId || typeof homeSectionId !== 'string' || homeSectionId.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'homeSectionId is required and must be a non-empty string',
        });
        return;
      }

      if (!productId || typeof productId !== 'string' || productId.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'productId is required and must be a non-empty string',
        });
        return;
      }

      const item = await homeSectionProductsService.create({
        homeSectionId: homeSectionId.trim(),
        productId: productId.trim(),
      });

      res.status(201).json({
        success: true,
        message: 'Product linked to home section successfully',
        data: item,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already added') || error.code === 'P2002';
      const isNotFound = error.message?.includes('does not exist');

      res.status(isConflict ? 409 : isNotFound ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to link product to home section',
      });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { homeSectionId, productId } = req.body;

      if (homeSectionId !== undefined && (typeof homeSectionId !== 'string' || homeSectionId.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'homeSectionId must be a non-empty string if provided',
        });
        return;
      }

      if (productId !== undefined && (typeof productId !== 'string' || productId.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'productId must be a non-empty string if provided',
        });
        return;
      }

      const updated = await homeSectionProductsService.update(id, {
        homeSectionId: homeSectionId ? homeSectionId.trim() : undefined,
        productId: productId ? productId.trim() : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Home section product updated successfully',
        data: updated,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already assigned') || error.code === 'P2002';
      const isNotFound = error.message?.includes('not found') || error.message?.includes('does not exist');

      res.status(isConflict ? 409 : isNotFound ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to update home section product',
      });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      const existing = await homeSectionProductsService.getById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Home section product record not found',
        });
        return;
      }

      await homeSectionProductsService.delete(id);

      res.status(200).json({
        success: true,
        message: 'Product removed from home section successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete home section product',
      });
    }
  },
};
