import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";
import env from "../config/env.js";

dotenv.config();

const categories = [
  {
    name: "Jewelry",
    slug: "jewelry",
    icon: "diamond-outline",
    subcategories: ["Necklaces", "Rings", "Earrings", "Bracelets", "Watches", "Brooches"],
  },
  {
    name: "Clothing",
    slug: "clothing",
    icon: "shirt-outline",
    subcategories: ["Dresses", "Tops", "Pants", "Outerwear", "Shoes", "Vintage Clothing"],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    icon: "home-outline",
    subcategories: ["Furniture", "Decor", "Kitchen", "Bedding", "Candles", "Storage"],
  },
  {
    name: "Art",
    slug: "art",
    icon: "color-palette-outline",
    subcategories: ["Paintings", "Prints", "Photography", "Sculpture", "Digital Art", "Drawing"],
  },
  {
    name: "Craft Supplies",
    slug: "craft-supplies",
    icon: "construct-outline",
    subcategories: ["Beads", "Fabric", "Yarn", "Tools", "Paper", "Wood"],
  },
  {
    name: "Vintage",
    slug: "vintage",
    icon: "time-outline",
    subcategories: ["Antiques", "Retro", "Mid-Century", "Victorian", "Art Deco"],
  },
  {
    name: "Accessories",
    slug: "accessories",
    icon: "glasses-outline",
    subcategories: ["Bags", "Wallets", "Hats", "Scarves", "Belts", "Sunglasses"],
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    icon: "game-controller-outline",
    subcategories: ["Puzzles", "Board Games", "Stuffed Animals", "Wooden Toys", "Dolls"],
  },
  {
    name: "Books",
    slug: "books",
    icon: "book-outline",
    subcategories: ["Fiction", "Non-Fiction", "Rare Books", "Comics", "Journals"],
  },
  {
    name: "Electronics",
    slug: "electronics",
    icon: "hardware-chip-outline",
    subcategories: ["Audio", "Cameras", "Gadgets", "Vintage Electronics"],
  },
  {
    name: "Collectibles",
    slug: "collectibles",
    icon: "trophy-outline",
    subcategories: ["Coins", "Stamps", "Cards", "Figurines", "Memorabilia"],
  },
  {
    name: "Other",
    slug: "other",
    icon: "pricetag-outline",
    subcategories: [],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await Category.deleteMany({});
    await Category.insertMany(categories);

    console.log(`✅ Seeded ${categories.length} categories`);
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seed();
