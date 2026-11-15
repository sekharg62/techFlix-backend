import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { generateSlug } from '../categories/categories.service';

export interface PlanInput {
  id?: string;
  name?: string;
  title?: string;
  price: number | string;
  durationDays?: number | string | null;
  validity?: string | null;
  inStock?: boolean;
}

export interface VariantInput {
  id?: string;
  name: string;
  description?: string | null;
  inStock?: boolean;
  plans: PlanInput[];
}

export interface CreateProductDTO {
  name: string;
  slug?: string;
  imgUrl: string;
  smallDesc: string;
  categoryId?: string | null;
  stock?: boolean;
  type?: string[];
  plans?: PlanInput[];
  variants?: VariantInput[];
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
  plans?: PlanInput[];
  variants?: VariantInput[];
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

/** Plans are always returned ordered, in the same shape the admin panel sends. */
export const plansInclude = {
  orderBy: { sortOrder: 'asc' as const },
  select: {
    id: true,
    name: true,
    price: true,
    durationDays: true,
    validity: true,
    inStock: true,
    sortOrder: true,
    variantId: true,
  },
};

/**
 * Variants with their plans. `plans` on the product stays the flat list of ALL plans
 * (each carrying `variantId`), so older clients keep working.
 */
export const variantsInclude = {
  orderBy: { sortOrder: 'asc' as const },
  select: {
    id: true,
    name: true,
    description: true,
    inStock: true,
    sortOrder: true,
    plans: plansInclude,
  },
};

/** Validate and normalise incoming plan objects. Throws on invalid input. */
export const normalizePlans = (plans: PlanInput[], path = 'plans') => {
  if (!Array.isArray(plans)) {
    throw new Error(`${path} must be an array`);
  }
  return plans.map((plan, index) => {
    const name = String(plan?.name || plan?.title || '').trim();
    if (!name) {
      throw new Error(`${path}[${index}].name is required`);
    }
    const price = Number(plan.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`${path}[${index}].price must be a non-negative number`);
    }
    let durationDays: number | null = null;
    if (plan.durationDays !== undefined && plan.durationDays !== null && plan.durationDays !== '') {
      durationDays = Number(plan.durationDays);
      if (!Number.isInteger(durationDays) || durationDays < 0) {
        throw new Error(`${path}[${index}].durationDays must be a non-negative integer`);
      }
    }
    return {
      id: typeof plan.id === 'string' && plan.id ? plan.id : undefined,
      name,
      price: new Prisma.Decimal(price.toFixed(2)),
      durationDays,
      validity: plan.validity ? String(plan.validity).trim() : null,
      inStock: plan.inStock !== undefined ? Boolean(plan.inStock) : true,
      sortOrder: index,
    };
  });
};

/** Validate and normalise incoming variants (each with its own plans). Throws on invalid input. */
export const normalizeVariants = (variants: VariantInput[]) => {
  if (!Array.isArray(variants)) {
    throw new Error('variants must be an array');
  }
  const seen = new Set<string>();
  return variants.map((variant, index) => {
    const name = String(variant?.name || '').trim();
    if (!name) {
      throw new Error(`variants[${index}].name is required`);
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`variants[${index}].name "${name}" is used twice`);
    }
    seen.add(key);
    const plans = normalizePlans(variant.plans ?? [], `variants[${index}].plans`);
    if (plans.length === 0) {
      throw new Error(`variants[${index}] ("${name}") needs at least one plan`);
    }
    return {
      id: typeof variant.id === 'string' && variant.id ? variant.id : undefined,
      name,
      description: variant.description ? String(variant.description).trim() || null : null,
      inStock: variant.inStock !== undefined ? Boolean(variant.inStock) : true,
      sortOrder: index,
      plans,
    };
  });
};

type NormalizedPlan = ReturnType<typeof normalizePlans>[number];
type NormalizedVariant = ReturnType<typeof normalizeVariants>[number];

/**
 * Sync a product's variants and plans inside a transaction.
 * - `plans` (when given) replaces the plans WITHOUT a variant.
 * - `variants` (when given) replaces all variants and their plans.
 * Leaving one out keeps that part untouched. Existing ids are updated in place so order history keeps its links.
 */
const syncProductPlans = async (
  tx: Prisma.TransactionClient,
  productId: string,
  plans: NormalizedPlan[] | undefined,
  variants: NormalizedVariant[] | undefined,
) => {
  if (plans === undefined && variants === undefined) return;

  // Sequential on purpose: one connection per interactive transaction.
  const existingPlans = await tx.productPlan.findMany({ where: { productId }, select: { id: true, variantId: true } });
  const existingVariants = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });
  const productPlanIds = new Set(existingPlans.map((p) => p.id));
  const productVariantIds = new Set(existingVariants.map((v) => v.id));
  const keptPlanIds = new Set<string>();
  const keptVariantIds = new Set<string>();

  const upsertPlan = async ({ id: planId, ...plan }: NormalizedPlan, variantId: string | null) => {
    if (planId && productPlanIds.has(planId)) {
      await tx.productPlan.update({ where: { id: planId }, data: { ...plan, variantId } });
      keptPlanIds.add(planId);
    } else {
      const created = await tx.productPlan.create({ data: { ...plan, productId, variantId } });
      keptPlanIds.add(created.id);
    }
  };

  if (variants !== undefined) {
    // Free up every existing name first so renames, swaps and "delete Mobile + add Mobile"
    // can't hit the (productId, name) unique index. Kept variants get their real name back below.
    if (productVariantIds.size > 0) {
      await tx.$executeRaw`UPDATE "ProductVariant" SET "name" = '__tmp__' || "id" WHERE "productId" = ${productId}`;
    }
    for (const { id: variantId, plans: variantPlans, ...data } of variants) {
      let vid: string;
      if (variantId && productVariantIds.has(variantId)) {
        await tx.productVariant.update({ where: { id: variantId }, data });
        vid = variantId;
      } else {
        const created = await tx.productVariant.create({ data: { ...data, productId } });
        vid = created.id;
      }
      keptVariantIds.add(vid);
      for (const plan of variantPlans) await upsertPlan(plan, vid);
    }
  }

  if (plans !== undefined) {
    for (const plan of plans) await upsertPlan(plan, null);
  }

  // Delete plans in the replaced scope(s) that were not sent back.
  const inScope = (p: { variantId: string | null }) =>
    (plans !== undefined && p.variantId === null) || (variants !== undefined && p.variantId !== null);
  const removedPlans = existingPlans.filter((p) => inScope(p) && !keptPlanIds.has(p.id)).map((p) => p.id);
  if (removedPlans.length > 0) {
    await tx.productPlan.deleteMany({ where: { id: { in: removedPlans } } });
  }

  if (variants !== undefined) {
    const removedVariants = [...productVariantIds].filter((vid) => !keptVariantIds.has(vid));
    if (removedVariants.length > 0) {
      await tx.productVariant.deleteMany({ where: { id: { in: removedVariants } } });
    }
  }
};

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  plans: plansInclude,
  variants: variantsInclude,
};

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
          plans: plansInclude,
          variants: variantsInclude,
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
        plans: plansInclude,
        variants: variantsInclude,
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
        plans: plansInclude,
        variants: variantsInclude,
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
        plans: plansInclude,
        variants: variantsInclude,
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

    const plans = normalizePlans(data.plans ?? []);
    const variants = data.variants !== undefined ? normalizeVariants(data.variants) : [];
    if (plans.length === 0 && variants.length === 0) {
      throw new Error('plans: add at least one plan or one variant with plans');
    }

    return await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
      data: {
        name: data.name.trim(),
        slug,
        imgUrl: data.imgUrl.trim(),
        smallDesc: data.smallDesc.trim(),
        categoryId: data.categoryId || null,
        stock: data.stock !== undefined ? Boolean(data.stock) : true,
        type: Array.isArray(data.type) ? data.type : [],
        longDesc: data.longDesc?.trim() || null,
        features: data.features !== undefined ? data.features : Prisma.JsonNull,
      },
      });
      await syncProductPlans(tx, created.id, plans, variants);
      return await tx.product.findUniqueOrThrow({ where: { id: created.id }, include: productInclude });
    }, { timeout: 30000 });
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

    const plans = data.plans !== undefined ? normalizePlans(data.plans) : undefined;
    const variants = data.variants !== undefined ? normalizeVariants(data.variants) : undefined;

    return await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: updateData });

      await syncProductPlans(tx, id, plans, variants);

      return await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    }, { timeout: 30000 });
  },

  deleteProduct: async (id: string) => {
    return await prisma.product.delete({
      where: { id },
    });
  },
};
