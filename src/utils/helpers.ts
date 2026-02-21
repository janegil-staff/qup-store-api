import { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: any,
  statusCode = 200
): void => {
  res.status(statusCode).json({ success: true, ...data });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
): void => {
  res.status(statusCode).json({ success: false, message });
};

export const paginate = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  limit,
});
