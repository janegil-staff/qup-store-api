import { Response } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError, paginate } from "../utils/helpers.js";
import env from "../config/env.js";

// POST /api/orders
export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity = 1, shippingAddress, isPickup } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      sendError(res, "Product not available", 404);
      return;
    }
    if (product.quantity < quantity) {
      sendError(res, "Insufficient stock");
      return;
    }
    if (product.seller.toString() === req.user!._id.toString()) {
      sendError(res, "Cannot buy your own product");
      return;
    }

    const unitPrice = product.price;
    const shippingPrice = isPickup ? 0 : product.shipping.freeShipping ? 0 : product.shipping.price;
    const subtotal = unitPrice * quantity + shippingPrice;
    const platformFee = Math.round(subtotal * (env.STRIPE_PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const totalPrice = subtotal;

    const order = await Order.create({
      buyer: req.user!._id,
      seller: product.seller,
      product: product._id,
      quantity,
      unitPrice,
      shippingPrice,
      platformFee,
      totalPrice,
      shippingAddress: isPickup ? {} : shippingAddress,
      isPickup: !!isPickup,
      status: "pending",
      statusHistory: [{ status: "pending", timestamp: new Date(), note: "Order created" }],
    });

    // Decrease product quantity
    product.quantity -= quantity;
    product.sold += quantity;
    if (product.quantity === 0) product.isActive = false;
    await product.save();

    const populated = await order.populate([
      { path: "product", select: "title images price" },
      { path: "seller", select: "name avatar" },
    ]);

    sendSuccess(res, { order: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/orders (buyer's orders)
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const filter: any = { buyer: req.user!._id };
    if (status) filter.status = status;

    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("product", "title images price")
        .populate("seller", "name avatar"),
      Order.countDocuments(filter),
    ]);

    sendSuccess(res, {
      orders,
      pagination: { page: Number(page), limit: lim, total, pages: Math.ceil(total / lim) },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/orders/sales (seller's sales)
export const getSales = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const filter: any = { seller: req.user!._id };
    if (status) filter.status = status;

    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("product", "title images price")
        .populate("buyer", "name avatar"),
      Order.countDocuments(filter),
    ]);

    sendSuccess(res, {
      orders,
      pagination: { page: Number(page), limit: lim, total, pages: Math.ceil(total / lim) },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/orders/:id
export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("product", "title images price description")
      .populate("buyer", "name avatar email")
      .populate("seller", "name avatar email");

    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }

    // Only buyer or seller can view
    const userId = req.user!._id.toString();
    if (order.buyer._id.toString() !== userId && order.seller._id.toString() !== userId) {
      sendError(res, "Not authorized", 403);
      return;
    }

    sendSuccess(res, { order });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// PATCH /api/orders/:id/status
export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note = "" } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }
    if (order.seller.toString() !== req.user!._id.toString()) {
      sendError(res, "Not authorized", 403);
      return;
    }

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note });
    await order.save();

    sendSuccess(res, { order });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// PATCH /api/orders/:id/tracking
export const addTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }
    if (order.seller.toString() !== req.user!._id.toString()) {
      sendError(res, "Not authorized", 403);
      return;
    }

    order.trackingNumber = trackingNumber;
    if (order.status === "paid") {
      order.status = "shipped";
      order.statusHistory.push({ status: "shipped", timestamp: new Date(), note: `Tracking: ${trackingNumber}` });
    }
    await order.save();

    sendSuccess(res, { order });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/orders/:id/cancel
export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }

    const userId = req.user!._id.toString();
    if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
      sendError(res, "Not authorized", 403);
      return;
    }

    if (!["pending", "paid"].includes(order.status)) {
      sendError(res, "Cannot cancel this order");
      return;
    }

    order.status = "cancelled";
    order.statusHistory.push({ status: "cancelled", timestamp: new Date(), note: "Cancelled by user" });
    await order.save();

    // Restore product quantity
    await Product.findByIdAndUpdate(order.product, {
      $inc: { quantity: order.quantity, sold: -order.quantity },
      isActive: true,
    });

    sendSuccess(res, { order });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
