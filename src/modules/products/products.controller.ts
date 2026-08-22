import { Request, Response } from 'express';
import { productsService } from './products.service';

export const productsController = {
  getPublic: async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, category, categoryId, search, stock, sortBy, sortOrder } = req.query;

      let parsedStock: boolean | undefined = undefined;
      if (stock === 'true') parsedStock = true;
      if (stock === 'false') parsedStock = false;

      const result = await productsService.getProductsWithPagination({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        category: typeof category === 'string' ? category : undefined,
        categoryId: typeof categoryId === 'string' ? categoryId : undefined,
        search: typeof search === 'string' ? search : undefined,
        stock: parsedStock,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      });

      res.status(200).json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch public products',
      });
    }
  },

  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, category, categoryId, search, stock, sortBy, sortOrder } = req.query;

      let parsedStock: boolean | undefined = undefined;
      if (stock === 'true') parsedStock = true;
      if (stock === 'false') parsedStock = false;

      const result = await productsService.getProductsWithPagination({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        category: typeof category === 'string' ? category : undefined,
        categoryId: typeof categoryId === 'string' ? categoryId : undefined,
        search: typeof search === 'string' ? search : undefined,
        stock: parsedStock,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      });

      res.status(200).json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch products',
      });
    }
  },

  getBySlug: async (req: Request, res: Response): Promise<void> => {
    try {
      const slug = req.params.slug as string;
      if (!slug || slug.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'slug parameter is required',
        });
        return;
      }

      const product = await productsService.getProductBySlug(slug.trim());

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch product by slug',
      });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const product = await productsService.getProductByIdOrSlug(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch product',
      });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, slug, imgUrl, smallDesc, categoryId, stock, type, plans, longDesc, features } = req.body;

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

      if (!imgUrl || typeof imgUrl !== 'string' || imgUrl.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'imgUrl is required and must be a non-empty string',
        });
        return;
      }

      if (!smallDesc || typeof smallDesc !== 'string' || smallDesc.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'smallDesc is required and must be a non-empty string',
        });
        return;
      }

      if (plans === undefined || plans === null) {
        res.status(400).json({
          success: false,
          message: 'plans is required and must be a valid JSON object or array',
        });
        return;
      }

      if (type !== undefined && !Array.isArray(type)) {
        res.status(400).json({
          success: false,
          message: 'type must be an array of strings if provided',
        });
        return;
      }

      const product = await productsService.createProduct({
        name,
        slug,
        imgUrl,
        smallDesc,
        categoryId: categoryId || null,
        stock,
        type,
        plans,
        longDesc,
        features,
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already exists');
      const isNotFound = error.message?.includes('does not exist');
      res.status(isConflict ? 409 : isNotFound ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to create product',
      });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, slug, imgUrl, smallDesc, categoryId, stock, type, plans, longDesc, features } = req.body;

      const existing = await productsService.getProductByIdOrSlug(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
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

      if (imgUrl !== undefined && (typeof imgUrl !== 'string' || imgUrl.trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'imgUrl must be a non-empty string',
        });
        return;
      }

      if (type !== undefined && !Array.isArray(type)) {
        res.status(400).json({
          success: false,
          message: 'type must be an array of strings if provided',
        });
        return;
      }

      const updated = await productsService.updateProduct(existing.id, {
        name,
        slug,
        imgUrl,
        smallDesc,
        categoryId,
        stock,
        type,
        plans,
        longDesc,
        features,
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updated,
      });
    } catch (error: any) {
      const isConflict = error.message?.includes('already exists');
      const isNotFound = error.message?.includes('does not exist');
      res.status(isConflict ? 409 : isNotFound ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to update product',
      });
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      const existing = await productsService.getProductById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      await productsService.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete product',
      });
    }
  },
};
