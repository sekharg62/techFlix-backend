import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { generateSlug } from '../categories/categories.service';

export interface CreateProductDTO {
  name: string;
  slug?: string;
  imgUrl: string;
  smallDesc: string;
  categoryId?: string | null;
  stock?: boolean;
  type?: string[];
  plans: any;
  longDesc?: string | null;
  features?: any;
}

export interface UpdateProductDTO {
  name?: string;
  slug?: string;
  imgUrl?: string;
  smallDesc?: string;
  categoryId?: string | null;
  stock?: boolean;
  type?: string[];
  plans?: any;
  longDesc?: string | null;
  features?: any;
}

export interface GetProductsQuery {
  page?: number;
  limit?: number;
  category?: string;
  categoryId?: string;
  search?: string;
  stock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productsService = {
  getProductsWithPagination: async (query: GetProductsQuery) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query.category && query.category.trim().length > 0 && query.category.toLowerCase() !== 'all') {
      const categoryParam = query.category.trim();
      where.category = {
        OR: [
          { slug: { equals: categoryParam, mode: 'insensitive' } },
          { id: categoryParam },
        ],
      };
    }

    if (query.stock !== undefined) {
      where.stock = query.stock;
    }

    if (query.search && query.search.trim().length > 0) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { smallDesc: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  },

  getProductById: async (id: string) => {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            desc: true,
          },
        },
      },
    });
  },

  getProductBySlug: async (slug: string) => {
    return await prisma.product.findFirst({
      where: {
        slug: {
          equals: slug.trim(),
          mode: 'insensitive',
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            desc: true,
          },
        },
      },
    });
  },

  getProductByIdOrSlug: async (identifier: string) => {
    return await prisma.product.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            desc: true,
          },
        },
      },
    });
  },

  createProduct: async (data: CreateProductDTO) => {
    if (data.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!categoryExists) {
        throw new Error(`Category with ID '${data.categoryId}' does not exist.`);
      }
    }

    const slug = data.slug && data.slug.trim().length > 0
      ? generateSlug(data.slug)
      : generateSlug(data.name);

    if (!slug) {
      throw new Error('A valid slug could not be determined for this product.');
    }

    const existingSlug = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new Error(`A product with slug '${slug}' already exists.`);
    }

    return await prisma.product.create({
      data: {
        name: data.name.trim(),
        slug,
        imgUrl: data.imgUrl.trim(),
        smallDesc: data.smallDesc.trim(),
        categoryId: data.categoryId || null,
        stock: data.stock !== undefined ? Boolean(data.stock) : true,
        type: Array.isArray(data.type) ? data.type : [],
        plans: data.plans,
        longDesc: data.longDesc?.trim() || null,
        features: data.features !== undefined ? data.features : Prisma.JsonNull,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  },

  updateProduct: async (id: string, data: UpdateProductDTO) => {
    if (data.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!categoryExists) {
        throw new Error(`Category with ID '${data.categoryId}' does not exist.`);
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.imgUrl !== undefined) updateData.imgUrl = data.imgUrl.trim();
    if (data.smallDesc !== undefined) updateData.smallDesc = data.smallDesc.trim();
    if (data.stock !== undefined) updateData.stock = Boolean(data.stock);
    if (data.type !== undefined) updateData.type = Array.isArray(data.type) ? data.type : [];
    if (data.plans !== undefined) updateData.plans = data.plans;
    if (data.longDesc !== undefined) updateData.longDesc = data.longDesc ? data.longDesc.trim() : null;
    if (data.features !== undefined) updateData.features = data.features;

    if (data.slug !== undefined) {
      const slug = generateSlug(data.slug);
      if (!slug) {
        throw new Error('Provided slug is invalid.');
      }

      const existingSlug = await prisma.product.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existingSlug) {
        throw new Error(`A product with slug '${slug}' already exists.`);
      }

      updateData.slug = slug;
    }

    if (data.categoryId !== undefined) {
      if (data.categoryId === null || data.categoryId === '') {
        updateData.category = { disconnect: true };
      } else {
        updateData.category = { connect: { id: data.categoryId } };
      }
    }

    return await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  },

  deleteProduct: async (id: string) => {
    return await prisma.product.delete({
      where: { id },
    });
  },
};
