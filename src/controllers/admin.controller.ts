import { Response } from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { sendSuccess, sendError, AuthRequest } from "../utils/helpers.js";

// Middleware: require admin role
export const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (req.user?.role !== "admin") {
    return sendError(res, "Admin access required", 403);
  }
  next();
};

// GET /api/admin/users
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const total = await User.countDocuments();
    const users = await User.find()
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    sendSuccess(res, { users, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// PATCH /api/admin/users/:id/ban
export const banUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true });
    if (!user) { sendError(res, "User not found", 404); return; }
    sendSuccess(res, { user });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// PATCH /api/admin/users/:id/unban
export const unbanUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false }, { new: true });
    if (!user) { sendError(res, "User not found", 404); return; }
    sendSuccess(res, { user });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// GET /api/admin/products
export const getAdminProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const total = await Product.countDocuments();
    const products = await Product.find()
      .populate("seller", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    sendSuccess(res, { products, total, page });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// DELETE /api/admin/products/:id
export const removeProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    sendSuccess(res, { message: "Product removed" });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// GET /api/admin/orders/stats
export const getOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalOrders, revenue] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
    ]);
    sendSuccess(res, {
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
      pendingReports: 0,
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
