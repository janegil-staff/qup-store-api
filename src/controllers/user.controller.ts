import { Request, Response } from "express";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";

// PUT /api/users/profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowedFields = ["name", "bio", "avatar", "location"];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(req.user!._id, updates, {
      new: true,
      runValidators: true,
    });

    sendSuccess(res, { user });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// PUT /api/users/password
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!._id).select("+password");

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, "Current password is incorrect", 401);
      return;
    }

    user.password = newPassword;
    await user.save();

    sendSuccess(res, { message: "Password updated" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/users/search?q=
export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q) {
      sendSuccess(res, { users: [] });
      return;
    }

    const users = await User.find({
      name: { $regex: q, $options: "i" },
      _id: { $ne: req.user!._id },
    })
      .select("name avatar bio rating reviewCount")
      .limit(20);

    sendSuccess(res, { users });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// DELETE /api/users/account
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndDelete(req.user!._id);
    // TODO: Clean up user's products, orders, conversations, etc.
    sendSuccess(res, { message: "Account deleted" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/users/:id/profile
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select("name avatar bio location rating reviewCount followers following createdAt");

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const isFollowing = user.followers.includes(req.user!._id);

    sendSuccess(res, {
      user,
      isFollowing,
      followerCount: user.followers.length,
      followingCount: user.following.length,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/users/:id/follow
export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user!._id.toString()) {
      sendError(res, "Cannot follow yourself");
      return;
    }

    const target = await User.findById(targetId);
    if (!target) {
      sendError(res, "User not found", 404);
      return;
    }

    const isFollowing = target.followers.includes(req.user!._id);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user!._id } });
      await User.findByIdAndUpdate(req.user!._id, { $pull: { following: targetId } });
      sendSuccess(res, { following: false });
    } else {
      // Follow
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: req.user!._id } });
      await User.findByIdAndUpdate(req.user!._id, { $addToSet: { following: targetId } });
      sendSuccess(res, { following: true });
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
