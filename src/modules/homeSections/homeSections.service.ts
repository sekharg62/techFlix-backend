import { plansInclude } from '../products/products.service';
import prisma from '../../utils/prisma';

export interface CreateHomeSectionDTO {
  title: string;
  desc: string;
  tag: string;
  productIds?: string[];
}

export interface UpdateHomeSectionDTO {
  title?: string;
  desc?: string;
  tag?: string;
  productIds?: string[];
}

export const homeSectionsService = {
  /** Storefront view: oldest section first, products with category + plans, no admin-only fields. */
  getPublicHomeSections: async () => {
    const sections = await prisma.homeSection.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        desc: true,
        tag: true,
        homeSectionProducts: {
          orderBy: { createdAt: 'asc' },
          select: {
            product: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                plans: plansInclude,
              },
            },
          },
        },
      },
    });
    return sections
      .map(({ homeSectionProducts, ...section }) => ({
        ...section,
        products: homeSectionProducts.map((hp) => hp.product),
      }))
      .filter((section) => section.products.length > 0);
  },

  getAllHomeSections: async () => {
    return await prisma.homeSection.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        homeSectionProducts: {
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
                plans: plansInclude,
              },
            },
          },
        },
      },
    });
  },

  getHomeSectionById: async (id: string) => {
    return await prisma.homeSection.findUnique({
      where: { id },
      include: {
        homeSectionProducts: {
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
                plans: plansInclude,
              },
            },
          },
        },
      },
    });
  },

  createHomeSection: async (data: CreateHomeSectionDTO) => {
    return await prisma.$transaction(async (tx) => {
      const section = await tx.homeSection.create({
        data: {
          title: data.title.trim(),
          desc: data.desc.trim(),
          tag: data.tag.trim(),
        },
      });

      if (data.productIds && data.productIds.length > 0) {
        await tx.homeSectionProduct.createMany({
          data: data.productIds.map((productId) => ({
            homeSectionId: section.id,
            productId,
          })),
          skipDuplicates: true,
        });
      }

      return await tx.homeSection.findUnique({
        where: { id: section.id },
        include: {
          homeSectionProducts: {
            include: {
              product: { include: { plans: plansInclude } },
            },
          },
        },
      });
    });
  },

  updateHomeSection: async (id: string, data: UpdateHomeSectionDTO) => {
    return await prisma.$transaction(async (tx) => {
      const updateData: { title?: string; desc?: string; tag?: string } = {};

      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.desc !== undefined) updateData.desc = data.desc.trim();
      if (data.tag !== undefined) updateData.tag = data.tag.trim();

      await tx.homeSection.update({
        where: { id },
        data: updateData,
      });

      if (data.productIds !== undefined) {
        await tx.homeSectionProduct.deleteMany({
          where: { homeSectionId: id },
        });

        if (data.productIds.length > 0) {
          await tx.homeSectionProduct.createMany({
            data: data.productIds.map((productId) => ({
              homeSectionId: id,
              productId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return await tx.homeSection.findUnique({
        where: { id },
        include: {
          homeSectionProducts: {
            include: {
              product: { include: { plans: plansInclude } },
            },
          },
        },
      });
    });
  },

  deleteHomeSection: async (id: string) => {
    return await prisma.homeSection.delete({
      where: { id },
    });
  },

  addProductToSection: async (homeSectionId: string, productId: string) => {
    return await prisma.homeSectionProduct.create({
      data: {
        homeSectionId,
        productId,
      },
      include: {
        product: { include: { plans: plansInclude } },
      },
    });
  },

  removeProductFromSection: async (homeSectionId: string, productId: string) => {
    return await prisma.homeSectionProduct.delete({
      where: {
        homeSectionId_productId: {
          homeSectionId,
          productId,
        },
      },
    });
  },
};
