import sharp from 'sharp';
import cloudinary from '../../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

const WEBP_QUALITY = 80;
const MAX_DIMENSION = 2560;

/**
 * Convert any supported image buffer to WebP.
 * Applies EXIF orientation and caps the longest side so huge photos don't bloat storage.
 */
export const convertToWebp = (fileBuffer: Buffer): Promise<Buffer> => {
  return sharp(fileBuffer, { animated: true })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
};

const uploadBufferToCloudinary = (
  fileBuffer: Buffer,
  folderName: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'image',
        format: 'webp',
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary upload result is undefined'));
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Convert the image to WebP, then upload it to Cloudinary.
 */
export const uploadImageToCloudinary = async (
  fileBuffer: Buffer,
  folderName: string = 'techflix'
): Promise<UploadApiResponse> => {
  let webpBuffer: Buffer;
  try {
    webpBuffer = await convertToWebp(fileBuffer);
  } catch {
    throw new Error('Invalid or unsupported image file');
  }
  return uploadBufferToCloudinary(webpBuffer, folderName);
};
