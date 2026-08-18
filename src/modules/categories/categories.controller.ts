import { Request, Response } from 'express';
import { categoriesService } from './categories.service';

export const categoriesController = {
  getAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await categoriesService.getAllCategories();
      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch categories',
      });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const category = await categoriesService.getCategoryById(id);

      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch category',
      });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, slug, desc } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'name is required and must be a non-empty string',
        });
        return;
      }

      if (slug !== undefined && typeof slug !== 'string') {
        res.status(400).json({
          success: false,
          message: 'slug must be a string if provided',
        });
        return;
      }

      if (desc !== undefined && typeof desc !== 'string') {
        res.status(400).json({
          success: false,
          message: 'desc must be a string if provided',
        });
        return;
      }

      const category = await categoriesService.createCategory({
        name,
        slug,
        desc,
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already exists');
      res.status(isConflict ? 409 : 500).json({
        success: false,
        message: error.message || 'Failed to create category',
      });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, slug, desc } = req.body;

      const existing = await categoriesService.getCategoryById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'name must be a non-empty string',
        });
        return;
      }

      if (slug !== undefined && typeof slug !== 'string') {
        res.status(400).json({
          success: false,
          message: 'slug must be a string if provided',
        });
        return;
      }

      if (desc !== undefined && typeof desc !== 'string') {
        res.status(400).json({
          success: false,
          message: 'desc must be a string if provided',
        });
        return;
      }

      const updated = await categoriesService.updateCategory(id, {
        name,
        slug,
        desc,
      });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: updated,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already exists');
      res.status(isConflict ? 409 : 500).json({
        success: false,
        message: error.message || 'Failed to update category',
      });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      const existing = await categoriesService.getCategoryById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      await categoriesService.deleteCategory(id);

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete category',
      });
    }
  },
};
