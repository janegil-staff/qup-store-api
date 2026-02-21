import { Request, Response } from "express";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import crypto from "crypto";

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      sendError(res, "Email already registered");
      return;
    }

    const user = await User.create({ name, email, password });

    const token = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = refreshToken;
    await user.save();

    sendSuccess(
      res,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        token,
        refreshToken,
      },
      201
    );
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email and password are required");
      return;
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      sendError(res, "Invalid credentials", 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, "Invalid credentials", 401);
      return;
    }

    const token = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = refreshToken;
    await user.save();

    sendSuccess(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
        rating: user.rating,
        reviewCount: user.reviewCount,
      },
      token,
      refreshToken,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/auth/refresh
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      sendError(res, "Refresh token required", 401);
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      sendError(res, "Invalid refresh token", 401);
      return;
    }

    const newToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = newRefreshToken;
    await user.save();

    sendSuccess(res, { token: newToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    sendError(res, "Invalid refresh token", 401);
  }
};

// GET /api/auth/me
export const getMe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id)
      .populate("favorites", "title images price")
      .select("-refreshToken");

    sendSuccess(res, { user });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/auth/logout
export const logout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.user!._id, { refreshToken: "" });
    sendSuccess(res, { message: "Logged out" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists
      sendSuccess(res, { message: "If the email exists, a reset link was sent" });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    // TODO: Send email with reset link
    // For now, just return success
    sendSuccess(res, { message: "If the email exists, a reset link was sent" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire");

    if (!user) {
      sendError(res, "Invalid or expired reset token");
      return;
    }

    user.password = password;
    user.resetPasswordToken = "";
    user.resetPasswordExpire = undefined as any;
    await user.save();

    sendSuccess(res, { message: "Password reset successful" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
