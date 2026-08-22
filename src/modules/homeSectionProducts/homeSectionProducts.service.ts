import prisma from '../../utils/prisma';

export interface CreateHomeSectionProductDTO {
  homeSectionId: string;
  productId: string;
}

export interface UpdateHomeSectionProductDTO {
  homeSectionId?: string;
  productId?: string;
}

export interface GetHomeSectionProductsQuery {
  homeSectionId?: string;
  productId?: string;
}

export const homeSectionProductsService = {
  getAll: async (query?: GetHomeSectionProductsQuery) => {
    const where: any = {};
    if (query?.homeSectionId) where.homeSectionId = query.homeSectionId;
    if (query?.productId) where.productId = query.productId;

    return await prisma.homeSectionProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        homeSection: {
          select: {
            id: true,
            title: true,
            desc: true,
            tag: true,
          },
        },
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  },

  getById: async (id: string) => {
    return await prisma.homeSectionProduct.findUnique({
      where: { id },
      include: {
        homeSection: true,
        product: {
          include: {
            category: true,
          },
        },
      },
    });
  },

  getBySectionId: async (homeSectionId: string) => {
    return await prisma.homeSectionProduct.findMany({
      where: { homeSectionId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  },

  create: async (data: CreateHomeSectionProductDTO) => {
    const homeSection = await prisma.homeSection.findUnique({
      where: { id: data.homeSectionId },
    });
    if (!homeSection) {
      throw new Error(`Home section with ID '${data.homeSectionId}' does not exist.`);
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) {
      throw new Error(`Product with ID '${data.productId}' does not exist.`);
    }

    const existing = await prisma.homeSectionProduct.findUnique({
      where: {
        homeSectionId_productId: {
          homeSectionId: data.homeSectionId,
          productId: data.productId,
        },
      },
    });
    if (existing) {
      throw new Error('This product is already added to this home section.');
    }

    return await prisma.homeSectionProduct.create({
      data: {
        homeSectionId: data.homeSectionId,
        productId: data.productId,
      },
      include: {
        homeSection: true,
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  },

  update: async (id: string, data: UpdateHomeSectionProductDTO) => {
    const existing = await prisma.homeSectionProduct.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Home section product record not found.');
    }

    const homeSectionId = data.homeSectionId || existing.homeSectionId;
    const productId = data.productId || existing.productId;

    if (data.homeSectionId) {
      const section = await prisma.homeSection.findUnique({ where: { id: data.homeSectionId } });
      if (!section) throw new Error(`Home section with ID '${data.homeSectionId}' does not exist.`);
    }

    if (data.productId) {
      const product = await prisma.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new Error(`Product with ID '${data.productId}' does not exist.`);
    }

    if (homeSectionId !== existing.homeSectionId || productId !== existing.productId) {
      const duplicate = await prisma.homeSectionProduct.findUnique({
        where: {
          homeSectionId_productId: {
            homeSectionId,
            productId,
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new Error('This product is already assigned to this home section.');
      }
    }

    return await prisma.homeSectionProduct.update({
      where: { id },
      data: {
        homeSectionId: data.homeSectionId,
        productId: data.productId,
      },
      include: {
        homeSection: true,
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  },

  delete: async (id: string) => {
    return await prisma.homeSectionProduct.delete({
      where: { id },
    });
  },
};
