import { Response } from "express";
import cloudinary from "../config/cloudinary.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";

// POST /api/upload/images (multiple)
export const uploadImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      sendError(res, "No files provided");
      return;
    }

    const uploadPromises = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "artisan-market/products",
              transformation: [
                { width: 1200, height: 1200, crop: "limit", quality: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result!.secure_url);
            }
          );
          stream.end(file.buffer);
        })
    );

    const urls = await Promise.all(uploadPromises);
    sendSuccess(res, { urls });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/upload/avatar
export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, "No file provided");
      return;
    }

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "artisan-market/avatars",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    sendSuccess(res, { url: result.secure_url });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// DELETE /api/upload/image
export const deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url) {
      sendError(res, "URL required");
      return;
    }

    // Extract public ID from Cloudinary URL
    const parts = url.split("/");
    const folderAndFile = parts.slice(-3).join("/").split(".")[0];

    await cloudinary.uploader.destroy(folderAndFile);
    sendSuccess(res, { message: "Image deleted" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
