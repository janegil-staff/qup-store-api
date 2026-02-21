import { Response } from "express";
import OpenAI from "openai";
import Product from "../models/Product.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import env from "../config/env.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// POST /api/ai/search — semantic search
export const search = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { query } = req.body;

    // Use GPT to extract search intent
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a search assistant for a handmade/vintage marketplace. Given a user query, extract structured search parameters. Return JSON only:
{
  "keywords": "search terms",
  "category": "matching category or null",
  "minPrice": number or null,
  "maxPrice": number or null,
  "condition": "new|like_new|good|fair|vintage or null",
  "tags": ["relevant", "tags"]
}
Categories: Jewelry, Clothing, Home & Living, Art, Craft Supplies, Vintage, Accessories, Toys & Games, Books, Electronics, Collectibles, Other`,
        },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
    });

    const params = JSON.parse(completion.choices[0].message.content || "{}");

    // Build query
    const filter: any = { isActive: true, quantity: { $gt: 0 } };
    if (params.keywords) filter.$text = { $search: params.keywords };
    if (params.category) filter.category = params.category;
    if (params.condition) filter.condition = params.condition;
    if (params.minPrice || params.maxPrice) {
      filter.price = {};
      if (params.minPrice) filter.price.$gte = params.minPrice;
      if (params.maxPrice) filter.price.$lte = params.maxPrice;
    }

    const products = await Product.find(filter)
      .sort({ favoriteCount: -1, createdAt: -1 })
      .limit(20)
      .populate("seller", "name avatar rating");

    sendSuccess(res, { products, searchParams: params });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/ai/recommendations
export const recommendations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Get user's favorites to understand preferences
    const user = await (await import("../models/User.js")).default
      .findById(req.user!._id)
      .populate("favorites", "category tags price");

    const favCategories = user?.favorites?.map((f: any) => f.category) || [];
    const favTags = user?.favorites?.flatMap((f: any) => f.tags) || [];

    let products;

    if (favCategories.length > 0) {
      // Recommend based on favorite patterns
      products = await Product.find({
        isActive: true,
        quantity: { $gt: 0 },
        seller: { $ne: req.user!._id },
        _id: { $nin: user?.favorites || [] },
        $or: [{ category: { $in: favCategories } }, { tags: { $in: favTags } }],
      })
        .sort({ favoriteCount: -1, createdAt: -1 })
        .limit(20)
        .populate("seller", "name avatar rating");
    } else {
      // New user — show popular items
      products = await Product.find({
        isActive: true,
        quantity: { $gt: 0 },
      })
        .sort({ favoriteCount: -1, views: -1 })
        .limit(20)
        .populate("seller", "name avatar rating");
    }

    sendSuccess(res, { products });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/ai/describe — generate listing description from text
export const describe = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { title, category, condition, materials } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that writes compelling product descriptions for a handmade/vintage marketplace. Keep descriptions concise (2-3 paragraphs), highlight unique qualities, and include relevant keywords for search. Be warm and authentic.",
        },
        {
          role: "user",
          content: `Write a product description for:
Title: ${title}
Category: ${category}
Condition: ${condition}
Materials: ${materials?.join(", ") || "N/A"}`,
        },
      ],
      max_tokens: 500,
    });

    const description = completion.choices[0].message.content;
    sendSuccess(res, { description });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
