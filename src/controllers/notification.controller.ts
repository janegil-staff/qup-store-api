import { Response } from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";

// GET /api/notifications
export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ recipient: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user!._id,
      isRead: false,
    });

    sendSuccess(res, { notifications, unreadCount });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// PATCH /api/notifications/read-all
export const readAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { recipient: req.user!._id, isRead: false },
      { isRead: true }
    );
    sendSuccess(res, { message: "All marked as read" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// PATCH /api/notifications/:id/read
export const readOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    sendSuccess(res, { message: "Marked as read" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// DELETE /api/notifications/:id
export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user!._id,
    });
    sendSuccess(res, { message: "Notification deleted" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/notifications/push-token
export const registerPushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user!._id, { pushToken: token });
    sendSuccess(res, { message: "Push token registered" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
