import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';

/** Error carrying an HTTP status code; thrown from services, rendered by asyncHandler. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

/** Wraps an async controller and converts thrown errors into JSON responses. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error: any) {
      if (error instanceof HttpError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          res.status(409).json({ success: false, message: 'A record with these details already exists' });
          return;
        }
        if (error.code === 'P2025') {
          res.status(404).json({ success: false, message: 'Record not found' });
          return;
        }
      }
      console.error(error);
      res.status(500).json({ success: false, message: error?.message || 'Internal Server Error' });
    }
  };

/**
 * JSON replacer that turns Prisma Decimal values into plain numbers
 * (by default they serialise as strings like "199.00").
 */
export function decimalReplacer(this: any, key: string, value: unknown) {
  const original = this?.[key];
  if (Prisma.Decimal.isDecimal(original)) {
    return (original as Prisma.Decimal).toNumber();
  }
  return value;
}

export const parsePagination = (query: { page?: unknown; limit?: unknown }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

export const paginationMeta = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);
  return { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
};
