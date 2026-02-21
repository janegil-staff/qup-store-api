import { Request, Response } from "express";
import Category from "../models/Category.js";
import { sendSuccess, sendError } from "../utils/helpers.js";

// GET /api/categories
export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    sendSuccess(res, { categories });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
