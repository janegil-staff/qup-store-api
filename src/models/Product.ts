import mongoose, { Schema, Document, Types } from "mongoose";

export const CATEGORIES = [
  "Jewelry",
  "Clothing",
  "Home & Living",
  "Art",
  "Craft Supplies",
  "Vintage",
  "Accessories",
  "Toys & Games",
  "Books",
  "Electronics",
  "Collectibles",
  "Other",
] as const;

export const CONDITIONS = [
  "new",
  "like_new",
  "good",
  "fair",
  "vintage",
] as const;

export interface IProduct extends Document {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number;
  images: string[];
  category: (typeof CATEGORIES)[number];
  subcategory: string;
  tags: string[];
  condition: (typeof CONDITIONS)[number];
  quantity: number;
  sold: number;
  shipping: {
    weight: number;
    price: number;
    freeShipping: boolean;
    localPickup: boolean;
  };
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  materials: string[];
  isActive: boolean;
  views: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 5000,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length > 0 && v.length <= 10,
        message: "1–10 images required",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: CATEGORIES,
    },
    subcategory: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    condition: {
      type: String,
      required: true,
      enum: CONDITIONS,
      default: "new",
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    sold: {
      type: Number,
      default: 0,
    },
    shipping: {
      weight: { type: Number, default: 0 },
      price: { type: Number, default: 0 },
      freeShipping: { type: Boolean, default: false },
      localPickup: { type: Boolean, default: false },
    },
    pickupLocation: {
      address: { type: String, default: "" },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    materials: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    favoriteCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text search index
productSchema.index({ title: "text", description: "text", tags: "text" });

// Geo index for nearby products
productSchema.index({ "pickupLocation.lat": 1, "pickupLocation.lng": 1 });

// Common query indexes
productSchema.index({ category: 1, isActive: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model<IProduct>("Product", productSchema);
