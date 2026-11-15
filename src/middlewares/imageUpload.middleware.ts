import { Request, Response, NextFunction, RequestHandler } from 'express';
import { upload } from './upload.middleware';
import { uploadImageToCloudinary } from '../modules/upload/upload.service';

interface ImageUploadOptions {
  /** Body field that receives the Cloudinary URL (e.g. "imgUrl"). */
  urlField: string;
  /** Cloudinary folder to store the image in. */
  folder: string;
  /** Multipart file field name. Defaults to "image". */
  fileField?: string;
  /** Multipart text fields to JSON-parse (arrays, objects, numbers, booleans). */
  jsonFields?: string[];
}

/**
 * Accepts an optional image in multipart/form-data, converts it to WebP,
 * uploads it to Cloudinary and puts the resulting URL into req.body[urlField].
 *
 * JSON requests pass through untouched, so clients that send a URL directly keep working.
 */
export const imageUpload = ({
  urlField,
  folder,
  fileField = 'image',
  jsonFields = [],
}: ImageUploadOptions): RequestHandler[] => [
  (req: Request, res: Response, next: NextFunction) => {
    upload.single(fileField)(req, res, (err: any) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message || 'Invalid image upload' });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.is('multipart/form-data')) {
        return next();
      }

      req.body = req.body || {};

      // Multipart sends everything as strings; restore the original types.
      for (const field of jsonFields) {
        const value = req.body[field];
        if (typeof value === 'string' && value.trim() !== '') {
          try {
            req.body[field] = JSON.parse(value);
          } catch {
            // leave as string; the controller's validation will report it
          }
        }
      }

      if (req.file) {
        const result = await uploadImageToCloudinary(req.file.buffer, folder);
        req.body[urlField] = result.secure_url;
      }

      next();
    } catch (error: any) {
      const isBadImage = error.message === 'Invalid or unsupported image file';
      res.status(isBadImage ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to upload image',
      });
    }
  },
];
