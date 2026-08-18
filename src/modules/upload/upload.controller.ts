import { Request, Response, NextFunction } from 'express';
import { uploadImageToCloudinary } from './upload.service';

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image file in the "image" field.',
      });
      return;
    }

    const folder = (req.body.folder as string) || 'techflix';
    const result = await uploadImageToCloudinary(req.file.buffer, folder);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.secure_url,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image to Cloudinary',
    });
  }
};
