import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma';

export const getUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
};

export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
};

export const createUser = async (data: { email: string; name?: string; password: string }) => {
  const user = await prisma.user.create({
    data,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
};

export const loginUser = async (credentials: { email: string; password: string }) => {
  const { email, password } = credentials;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.password !== password) {
    throw new Error('Invalid email or password');
  }

  const secret = process.env.JWT_SECRET || 'default_secret';
  const token = jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
};
