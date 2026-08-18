import prisma from '../../utils/prisma';

export interface CreateHeroSlideDTO {
  order: number;
  imageUrl: string;
}

export interface UpdateHeroSlideDTO {
  order?: number;
  imageUrl?: string;
}

export const heroSlidesService = {
  getAllSlides: async () => {
    return await prisma.heroSlide.findMany({
      orderBy: {
        order: 'asc',
      },
    });
  },

  getSlideById: async (id: string) => {
    return await prisma.heroSlide.findUnique({
      where: { id },
    });
  },

  createSlide: async (data: CreateHeroSlideDTO) => {
    const existingOrder = await prisma.heroSlide.findUnique({
      where: { order: data.order },
    });

    if (existingOrder) {
      throw new Error(`A hero slide with order ${data.order} already exists.`);
    }

    return await prisma.heroSlide.create({
      data: {
        order: data.order,
        imageUrl: data.imageUrl,
      },
    });
  },

  updateSlide: async (id: string, data: UpdateHeroSlideDTO) => {
    if (data.order !== undefined) {
      const existingOrder = await prisma.heroSlide.findFirst({
        where: {
          order: data.order,
          NOT: { id },
        },
      });

      if (existingOrder) {
        throw new Error(`A hero slide with order ${data.order} already exists.`);
      }
    }

    return await prisma.heroSlide.update({
      where: { id },
      data,
    });
  },

  deleteSlide: async (id: string) => {
    return await prisma.heroSlide.delete({
      where: { id },
    });
  },
};
