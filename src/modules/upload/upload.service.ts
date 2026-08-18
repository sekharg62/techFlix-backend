import cloudinary from '../../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export const uploadImageToCloudinary = (
  fileBuffer: Buffer,
  folderName: string = 'techflix'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'image',
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
