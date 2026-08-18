import prisma from '../../utils/prisma';

export interface CreateCategoryDTO {
  name: string;
  slug?: string;
  desc?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  desc?: string;
}

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const categoriesService = {
  getAllCategories: async () => {
    return await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  },

  getCategoryById: async (id: string) => {
    return await prisma.category.findUnique({
      where: { id },
    });
  },

  getCategoryBySlug: async (slug: string) => {
    return await prisma.category.findUnique({
      where: { slug },
    });
  },

  createCategory: async (data: CreateCategoryDTO) => {
    const slug = data.slug && data.slug.trim().length > 0 
      ? generateSlug(data.slug) 
      : generateSlug(data.name);

    if (!slug) {
      throw new Error('A valid slug could not be determined for this category.');
    }

    const existingSlug = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new Error(`A category with slug '${slug}' already exists.`);
    }

    return await prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        desc: data.desc?.trim() || null,
      },
    });
  },

  updateCategory: async (id: string, data: UpdateCategoryDTO) => {
    const updateData: { name?: string; slug?: string; desc?: string | null } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.desc !== undefined) {
      updateData.desc = data.desc.trim().length > 0 ? data.desc.trim() : null;
    }

    if (data.slug !== undefined) {
      const slug = generateSlug(data.slug);
      if (!slug) {
        throw new Error('Provided slug is invalid.');
      }

      const existingSlug = await prisma.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existingSlug) {
        throw new Error(`A category with slug '${slug}' already exists.`);
      }

      updateData.slug = slug;
    }

    return await prisma.category.update({
      where: { id },
      data: updateData,
    });
  },

  deleteCategory: async (id: string) => {
    return await prisma.category.delete({
      where: { id },
    });
  },
};
