import prisma from '../../utils/prisma';

export interface CreateReviewInput {
  name: string;
  role?: string;
  description: string;
  profileUrl?: string;
  starCount?: number;
}

export interface UpdateReviewInput {
  name?: string;
  role?: string;
  description?: string;
  profileUrl?: string;
  starCount?: number;
}

export const getAllReviews = async () => {
  return await prisma.review.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getReviewById = async (id: string) => {
  return await prisma.review.findUnique({
    where: { id },
  });
};

export const createReview = async (data: CreateReviewInput) => {
  return await prisma.review.create({
    data: {
      name: data.name,
      role: data.role || null,
      description: data.description,
      profileUrl: data.profileUrl || null,
      starCount: typeof data.starCount === 'number' ? data.starCount : 5,
    },
  });
};

export const updateReview = async (id: string, data: UpdateReviewInput) => {
  return await prisma.review.update({
    where: { id },
    data,
  });
};

export const deleteReview = async (id: string) => {
  return await prisma.review.delete({
    where: { id },
  });
};
