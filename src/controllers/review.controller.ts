import { Response } from "express";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";

// POST /api/reviews
export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, rating, title, comment, images } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }
    if (order.buyer.toString() !== req.user!._id.toString()) {
      sendError(res, "Not authorized", 403);
      return;
    }
    if (order.status !== "delivered") {
      sendError(res, "Can only review delivered orders");
      return;
    }

    const existing = await Review.findOne({ order: orderId });
    if (existing) {
      sendError(res, "Already reviewed this order");
      return;
    }

    const review = await Review.create({
      reviewer: req.user!._id,
      seller: order.seller,
      product: order.product,
      order: orderId,
      rating,
      title,
      comment,
      images: images || [],
    });

    // Update seller rating
    const reviews = await Review.find({ seller: order.seller });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await User.findByIdAndUpdate(order.seller, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    });

    const populated = await review.populate("reviewer", "name avatar");
    sendSuccess(res, { review: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/reviews/seller/:id
export const getSellerReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find({ seller: req.params.id })
      .sort({ createdAt: -1 })
      .populate("reviewer", "name avatar")
      .populate("product", "title images");

    sendSuccess(res, { reviews });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/reviews/product/:id
export const getProductReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .populate("reviewer", "name avatar");

    sendSuccess(res, { reviews });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
