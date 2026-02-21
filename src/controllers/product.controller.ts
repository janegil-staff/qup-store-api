import { Request, Response } from "express";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError, paginate } from "../utils/helpers.js";

// GET /api/products
export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      q,
      category,
      condition,
      minPrice,
      maxPrice,
      sort = "newest",
      page = "1",
      limit = "20",
      lat,
      lng,
      radius,
    } = req.query;

    const filter: any = { isActive: true, quantity: { $gt: 0 } };

    // Text search
    if (q) filter.$text = { $search: q as string };

    // Filters
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Location-based filter
    if (lat && lng && radius) {
      const radiusKm = Number(radius);
      const latNum = Number(lat);
      const lngNum = Number(lng);
      filter["pickupLocation.lat"] = {
        $gte: latNum - radiusKm / 111,
        $lte: latNum + radiusKm / 111,
      };
      filter["pickupLocation.lng"] = {
        $gte: lngNum - radiusKm / (111 * Math.cos((latNum * Math.PI) / 180)),
        $lte: lngNum + radiusKm / (111 * Math.cos((latNum * Math.PI) / 180)),
      };
      filter["shipping.localPickup"] = true;
    }

    // Sort
    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_low: { price: 1 },
      price_high: { price: -1 },
      popular: { favoriteCount: -1 },
    };
    const sortBy = sortMap[sort as string] || sortMap.newest;

    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(lim)
        .populate("seller", "name avatar rating"),
      Product.countDocuments(filter),
    ]);

    sendSuccess(res, {
      products,
      pagination: {
        page: Number(page),
        limit: lim,
        total,
        pages: Math.ceil(total / lim),
      },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/products/:id
export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name avatar bio rating reviewCount location createdAt"
    );

    if (!product) {
      sendError(res, "Product not found", 404);
      return;
    }

    // Increment views
    product.views += 1;
    await product.save();

    // Check if user has favorited
    const isFavorite = req.user!.favorites.some(
      (fav) => fav.toString() === product._id.toString()
    );

    sendSuccess(res, { product, isFavorite });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/products
export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.create({
      ...req.body,
      seller: req.user!._id,
    });

    // Update user role to seller/both
    if (req.user!.role === "buyer") {
      await User.findByIdAndUpdate(req.user!._id, { role: "both" });
    }

    sendSuccess(res, { product }, 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// PUT /api/products/:id
export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      sendError(res, "Product not found", 404);
      return;
    }
    if (product.seller.toString() !== req.user!._id.toString()) {
      sendError(res, "Not authorized", 403);
      return;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    sendSuccess(res, { product: updated });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// DELETE /api/products/:id
export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      sendError(res, "Product not found", 404);
      return;
    }
    if (product.seller.toString() !== req.user!._id.toString()) {
      sendError(res, "Not authorized", 403);
      return;
    }

    await product.deleteOne();
    sendSuccess(res, { message: "Product deleted" });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/products/seller/:id
export const getBySeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "20" } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const [products, total] = await Promise.all([
      Product.find({ seller: req.params.id, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Product.countDocuments({ seller: req.params.id, isActive: true }),
    ]);

    sendSuccess(res, {
      products,
      pagination: { page: Number(page), limit: lim, total, pages: Math.ceil(total / lim) },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/products/:id/favorite
export const toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      sendError(res, "Product not found", 404);
      return;
    }

    const isFavorite = req.user!.favorites.some(
      (fav) => fav.toString() === productId
    );

    if (isFavorite) {
      await User.findByIdAndUpdate(req.user!._id, { $pull: { favorites: productId } });
      await Product.findByIdAndUpdate(productId, { $inc: { favoriteCount: -1 } });
      sendSuccess(res, { favorited: false });
    } else {
      await User.findByIdAndUpdate(req.user!._id, { $addToSet: { favorites: productId } });
      await Product.findByIdAndUpdate(productId, { $inc: { favoriteCount: 1 } });
      sendSuccess(res, { favorited: true });
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/products/favorites
export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).populate({
      path: "favorites",
      populate: { path: "seller", select: "name avatar" },
    });

    sendSuccess(res, { products: user?.favorites || [] });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
