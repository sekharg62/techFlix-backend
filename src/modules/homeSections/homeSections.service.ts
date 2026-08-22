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
              product: true,
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
              product: true,
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
        product: true,
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
