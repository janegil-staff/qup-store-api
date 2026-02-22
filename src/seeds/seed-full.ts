import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import env from "../config/env.ts";

dotenv.config();

// ─── Import Models ───────────────────────────────────────────────────
import User from "../models/User.ts";
import Product from "../models/Product.ts";
import Category from "../models/Category.ts";
import Order from "../models/Order.ts";
import Review from "../models/Review.ts";
import Conversation from "../models/Conversation.ts";
import Message from "../models/Message.ts";
import Notification from "../models/Notification.ts";

// ─── Config ──────────────────────────────────────────────────────────
const DEMO_PASSWORD = "password123";

// ─── Categories ──────────────────────────────────────────────────────
const categories = [
  {
    name: "Jewelry",
    slug: "jewelry",
    icon: "diamond-outline",
    subcategories: [
      "Necklaces",
      "Rings",
      "Earrings",
      "Bracelets",
      "Watches",
      "Brooches",
    ],
  },
  {
    name: "Clothing",
    slug: "clothing",
    icon: "shirt-outline",
    subcategories: [
      "Dresses",
      "Tops",
      "Pants",
      "Outerwear",
      "Shoes",
      "Vintage Clothing",
    ],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    icon: "home-outline",
    subcategories: [
      "Furniture",
      "Decor",
      "Kitchen",
      "Bedding",
      "Candles",
      "Storage",
    ],
  },
  {
    name: "Art",
    slug: "art",
    icon: "color-palette-outline",
    subcategories: [
      "Paintings",
      "Prints",
      "Photography",
      "Sculpture",
      "Digital Art",
      "Drawing",
    ],
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
    subcategories: [
      "Antiques",
      "Retro",
      "Mid-Century",
      "Victorian",
      "Art Deco",
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    icon: "glasses-outline",
    subcategories: [
      "Bags",
      "Wallets",
      "Hats",
      "Scarves",
      "Belts",
      "Sunglasses",
    ],
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    icon: "game-controller-outline",
    subcategories: [
      "Puzzles",
      "Board Games",
      "Stuffed Animals",
      "Wooden Toys",
      "Dolls",
    ],
  },
  {
    name: "Books",
    slug: "books",
    icon: "book-outline",
    subcategories: [
      "Fiction",
      "Non-Fiction",
      "Rare Books",
      "Comics",
      "Journals",
    ],
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
  { name: "Other", slug: "other", icon: "pricetag-outline", subcategories: [] },
];

// ─── Demo Users ──────────────────────────────────────────────────────
const demoUsers = [
  {
    name: "Emma Woodcraft",
    email: "emma@demo.com",
    bio: "Handmade jewelry designer from Portland. I use recycled metals and ethically sourced gems to create unique pieces.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    location: { address: "Portland, OR", lat: 45.5152, lng: -122.6784 },
    role: "both",
    rating: 4.8,
    reviewCount: 24,
  },
  {
    name: "Marcus Chen",
    email: "marcus@demo.com",
    bio: "Vintage collector and curator. Specializing in mid-century modern furniture and decor from the 50s-70s.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    location: { address: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
    role: "both",
    rating: 4.6,
    reviewCount: 18,
  },
  {
    name: "Sofia Rivera",
    email: "sofia@demo.com",
    bio: "Textile artist creating hand-woven tapestries and macrame wall hangings. Each piece takes 20-40 hours to complete.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    location: { address: "Austin, TX", lat: 30.2672, lng: -97.7431 },
    role: "both",
    rating: 4.9,
    reviewCount: 31,
  },
  {
    name: "James Harper",
    email: "james@demo.com",
    bio: "Woodworker and furniture maker. Custom pieces crafted from reclaimed wood in my Brooklyn workshop.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    location: { address: "Brooklyn, NY", lat: 40.6782, lng: -73.9442 },
    role: "both",
    rating: 4.7,
    reviewCount: 15,
  },
  {
    name: "Lily Kim",
    email: "lily@demo.com",
    bio: "Ceramic artist making functional pottery for everyday use. Wheel-thrown and hand-glazed in my studio.",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    location: { address: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
    role: "both",
    rating: 4.5,
    reviewCount: 22,
  },
  {
    name: "Oliver Stone",
    email: "oliver@demo.com",
    bio: "Leather craftsman. Handstitched bags, wallets, and accessories made from full-grain leather.",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    location: { address: "Nashville, TN", lat: 36.1627, lng: -86.7816 },
    role: "both",
    rating: 4.4,
    reviewCount: 12,
  },
  {
    name: "Test Buyer",
    email: "buyer@demo.com",
    bio: "Love discovering unique handmade items!",
    avatar: "",
    location: { address: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
    role: "buyer",
    rating: 0,
    reviewCount: 0,
  },
];

// ─── Demo Products ───────────────────────────────────────────────────
const demoProducts = [
  // Emma's jewelry
  {
    sellerIndex: 0,
    title: "Hammered Gold Crescent Moon Necklace",
    description:
      "A delicate crescent moon pendant hand-hammered from recycled 14k gold fill. Hangs on a dainty 18-inch chain with a lobster clasp. The hammered texture catches light beautifully and gives each piece its own unique character. Perfect for layering or wearing on its own.",
    price: 68,
    compareAtPrice: 85,
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600",
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600",
    ],
    category: "Jewelry",
    subcategory: "Necklaces",
    tags: ["gold", "moon", "handmade", "minimalist", "gift"],
    condition: "new",
    quantity: 8,
    materials: ["14k Gold Fill", "Recycled Metal"],
    shipping: {
      weight: 0.1,
      price: 4.99,
      freeShipping: false,
      localPickup: false,
    },
    favoriteCount: 42,
    views: 380,
    sold: 12,
  },
  {
    sellerIndex: 0,
    title: "Raw Amethyst Crystal Ring — Sterling Silver",
    description:
      "A stunning raw amethyst crystal set in hand-forged sterling silver. Each ring is one-of-a-kind due to the natural variations in the crystal. The band is slightly adjustable for a comfortable fit. Amethyst is known for its calming properties and gorgeous purple hues.",
    price: 45,
    images: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600",
      "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600",
    ],
    category: "Jewelry",
    subcategory: "Rings",
    tags: ["amethyst", "crystal", "silver", "boho", "healing"],
    condition: "new",
    quantity: 5,
    materials: ["Sterling Silver", "Raw Amethyst"],
    shipping: { weight: 0.1, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 67,
    views: 520,
    sold: 8,
  },
  {
    sellerIndex: 0,
    title: "Minimalist Stacking Rings Set of 3",
    description:
      "A set of three delicate stacking rings in mixed metals — one rose gold, one silver, and one gold. Each ring is 1mm thin and hand-finished with a mirror polish. Wear them together or separately for an effortlessly chic look.",
    price: 38,
    images: [
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600",
    ],
    category: "Jewelry",
    subcategory: "Rings",
    tags: ["stacking", "minimalist", "mixed metals", "dainty"],
    condition: "new",
    quantity: 15,
    materials: ["Sterling Silver", "Gold Fill", "Rose Gold Fill"],
    shipping: { weight: 0.1, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 89,
    views: 710,
    sold: 23,
  },

  // Marcus's vintage
  {
    sellerIndex: 1,
    title: "Mid-Century Teak Danish Desk Lamp",
    description:
      "Authentic 1960s Danish desk lamp with a teak wood base and adjustable brass arm. The shade has been restored with new linen and rewired for modern electrical standards. Perfect for a home office or reading nook. Tested and fully functional.",
    price: 185,
    compareAtPrice: 250,
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057ab834?w=600",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600",
    ],
    category: "Vintage",
    subcategory: "Mid-Century",
    tags: ["danish", "mid-century", "teak", "lamp", "1960s"],
    condition: "vintage",
    quantity: 1,
    materials: ["Teak Wood", "Brass", "Linen"],
    shipping: {
      weight: 3,
      price: 18.99,
      freeShipping: false,
      localPickup: true,
    },
    pickupLocation: {
      address: "San Francisco, CA",
      lat: 37.7749,
      lng: -122.4194,
    },
    favoriteCount: 34,
    views: 290,
    sold: 0,
  },
  {
    sellerIndex: 1,
    title: "Vintage Polaroid SX-70 Camera — Tested",
    description:
      "Iconic Polaroid SX-70 folding SLR camera in excellent working condition. This is the original 1972 chrome model with tan leather. Fully tested with a fresh pack of film. Comes with the original leather carrying case. A true collector's item that still takes beautiful photos.",
    price: 320,
    images: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600",
    ],
    category: "Electronics",
    subcategory: "Cameras",
    tags: ["polaroid", "vintage", "camera", "retro", "photography"],
    condition: "good",
    quantity: 1,
    materials: ["Chrome", "Leather"],
    shipping: {
      weight: 1,
      price: 12.99,
      freeShipping: false,
      localPickup: true,
    },
    pickupLocation: {
      address: "San Francisco, CA",
      lat: 37.7749,
      lng: -122.4194,
    },
    favoriteCount: 56,
    views: 445,
    sold: 0,
  },

  // Sofia's textiles
  {
    sellerIndex: 2,
    title: "Boho Macrame Wall Hanging — Large",
    description:
      "Hand-knotted macrame wall hanging made from 100% natural cotton cord. This large statement piece measures 36 inches wide and 48 inches long. Features an intricate diamond pattern with long flowing fringe. Mounted on a driftwood branch collected from the Texas coast.",
    price: 125,
    images: [
      "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=600",
      "https://images.unsplash.com/photo-1615529328520-b193f7e49c40?w=600",
    ],
    category: "Home & Living",
    subcategory: "Decor",
    tags: ["macrame", "boho", "wall hanging", "cotton", "handmade"],
    condition: "new",
    quantity: 3,
    materials: ["Natural Cotton Cord", "Driftwood"],
    shipping: { weight: 2, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 73,
    views: 612,
    sold: 7,
  },
  {
    sellerIndex: 2,
    title: "Hand-Woven Tapestry — Desert Sunset",
    description:
      "A stunning hand-woven wall tapestry inspired by desert sunsets. Created on a frame loom using a blend of wool, cotton, and linen yarns in warm terracotta, gold, cream, and rust tones. This piece took approximately 35 hours to complete. Dimensions: 24x30 inches.",
    price: 245,
    images: [
      "https://images.unsplash.com/photo-1615529328520-b193f7e49c40?w=600",
    ],
    category: "Art",
    subcategory: "Paintings",
    tags: ["tapestry", "woven", "desert", "fiber art", "handmade"],
    condition: "new",
    quantity: 1,
    materials: ["Wool", "Cotton", "Linen"],
    shipping: { weight: 1.5, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 91,
    views: 830,
    sold: 0,
  },

  // James's woodwork
  {
    sellerIndex: 3,
    title: "Reclaimed Wood Floating Shelves — Set of 3",
    description:
      "A set of three floating shelves made from reclaimed barn wood sourced from upstate New York. Each shelf has been cleaned, sanded, and sealed while preserving the natural character and patina. Includes all mounting hardware. Dimensions: 24, 20, and 16 inches long, all 6 inches deep.",
    price: 89,
    images: [
      "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=600",
    ],
    category: "Home & Living",
    subcategory: "Furniture",
    tags: ["shelves", "reclaimed wood", "rustic", "floating", "barn wood"],
    condition: "new",
    quantity: 6,
    materials: ["Reclaimed Barn Wood", "Steel Brackets"],
    shipping: {
      weight: 5,
      price: 14.99,
      freeShipping: false,
      localPickup: true,
    },
    pickupLocation: { address: "Brooklyn, NY", lat: 40.6782, lng: -73.9442 },
    favoriteCount: 48,
    views: 340,
    sold: 4,
  },
  {
    sellerIndex: 3,
    title: "Walnut Cutting Board with Juice Groove",
    description:
      "A beautiful end-grain cutting board crafted from American black walnut. Features a deep juice groove around the perimeter and rubber feet on the bottom. Finished with food-safe mineral oil and beeswax. Dimensions: 16x12x1.5 inches. Makes an incredible gift.",
    price: 75,
    images: [
      "https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=600",
    ],
    category: "Home & Living",
    subcategory: "Kitchen",
    tags: ["cutting board", "walnut", "kitchen", "handmade", "gift"],
    condition: "new",
    quantity: 10,
    materials: ["American Black Walnut", "Mineral Oil", "Beeswax"],
    shipping: { weight: 3, price: 0, freeShipping: true, localPickup: true },
    pickupLocation: { address: "Brooklyn, NY", lat: 40.6782, lng: -73.9442 },
    favoriteCount: 62,
    views: 490,
    sold: 14,
  },

  // Lily's ceramics
  {
    sellerIndex: 4,
    title: "Handmade Ceramic Mug — Speckled Blue",
    description:
      "A cozy handmade ceramic mug wheel-thrown from stoneware clay and glazed in a beautiful speckled blue finish. Holds approximately 12oz and fits comfortably in your hand. Microwave and dishwasher safe. Each mug is slightly unique due to the handmade process.",
    price: 32,
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600",
    ],
    category: "Home & Living",
    subcategory: "Kitchen",
    tags: ["ceramic", "mug", "pottery", "handmade", "blue"],
    condition: "new",
    quantity: 20,
    materials: ["Stoneware Clay", "Food-Safe Glaze"],
    shipping: { weight: 0.5, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 104,
    views: 920,
    sold: 45,
  },
  {
    sellerIndex: 4,
    title: "Ceramic Planter Set — Earth Tones",
    description:
      "A set of three ceramic planters in earthy tones — terracotta, sand, and olive. Wheel-thrown with drainage holes and matching saucers. Perfect for succulents, herbs, or small houseplants. Sizes: 4, 5, and 6 inches in diameter.",
    price: 58,
    images: [
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600",
    ],
    category: "Home & Living",
    subcategory: "Decor",
    tags: ["planter", "ceramic", "plants", "earth tones", "handmade"],
    condition: "new",
    quantity: 8,
    materials: ["Stoneware Clay"],
    shipping: {
      weight: 2,
      price: 8.99,
      freeShipping: false,
      localPickup: false,
    },
    favoriteCount: 55,
    views: 430,
    sold: 9,
  },

  // Oliver's leather
  {
    sellerIndex: 5,
    title: "Hand-Stitched Leather Wallet — Cognac",
    description:
      "A classic bifold wallet hand-stitched from full-grain vegetable-tanned leather in rich cognac. Features 6 card slots, 2 hidden pockets, and a bill compartment. The leather will develop a beautiful patina over time. Saddle-stitched with waxed linen thread for durability.",
    price: 85,
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600",
    ],
    category: "Accessories",
    subcategory: "Wallets",
    tags: ["leather", "wallet", "handstitched", "cognac", "gift"],
    condition: "new",
    quantity: 12,
    materials: ["Full-Grain Leather", "Waxed Linen Thread"],
    shipping: { weight: 0.2, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 38,
    views: 310,
    sold: 6,
  },
  {
    sellerIndex: 5,
    title: "Leather Crossbody Bag — Vintage Brown",
    description:
      "A beautifully crafted crossbody bag made from premium full-grain leather. Features an adjustable strap, magnetic closure, interior zipper pocket, and two card slots. The leather is hand-dyed to achieve this rich vintage brown color. Dimensions: 9x7x2 inches.",
    price: 165,
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"],
    category: "Accessories",
    subcategory: "Bags",
    tags: ["leather", "crossbody", "bag", "handmade", "brown"],
    condition: "new",
    quantity: 4,
    materials: ["Full-Grain Leather", "Brass Hardware"],
    shipping: { weight: 0.8, price: 0, freeShipping: true, localPickup: false },
    favoriteCount: 72,
    views: 580,
    sold: 3,
  },
];

// ─── Review Templates ────────────────────────────────────────────────
const reviewTemplates = [
  {
    rating: 5,
    title: "Absolutely love it!",
    comment:
      "Exceeded my expectations. The quality is incredible and it arrived beautifully packaged. Will definitely order again.",
  },
  {
    rating: 5,
    title: "Perfect gift",
    comment:
      "Bought this as a gift and the recipient was thrilled. Beautifully made and exactly as described.",
  },
  {
    rating: 4,
    title: "Great quality",
    comment:
      "Really well made and looks beautiful. Shipping was a bit slow but worth the wait.",
  },
  {
    rating: 5,
    title: "Stunning craftsmanship",
    comment:
      "You can tell this was made with love and attention to detail. Truly unique piece.",
  },
  {
    rating: 4,
    title: "Very nice",
    comment:
      "Good quality and looks great. The color was slightly different from the photos but I still love it.",
  },
  {
    rating: 5,
    title: "Better than expected",
    comment:
      "The photos don't do it justice — it's even more beautiful in person. Fast shipping too!",
  },
  {
    rating: 5,
    title: "Incredible work",
    comment:
      "This is my third purchase from this seller. Consistently amazing quality and great communication.",
  },
  {
    rating: 4,
    title: "Lovely piece",
    comment:
      "Beautiful work. Took a little longer to arrive than expected but the seller kept me updated.",
  },
];

// ─── Seed Function ───────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // 1. Seed categories
    console.log("📂 Seeding categories...");
    await Category.insertMany(categories);

    // 2. Seed users
    console.log("👤 Seeding users...");
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
    const createdUsers = await User.insertMany(
      demoUsers.map((u) => ({ ...u, password: hashedPassword })),
    );
    console.log(`   Created ${createdUsers.length} users`);

    // Add some followers
    for (let i = 0; i < 6; i++) {
      const followerIds = createdUsers
        .filter((_, j) => j !== i && Math.random() > 0.4)
        .map((u) => u._id);
      await User.findByIdAndUpdate(createdUsers[i]._id, {
        followers: followerIds,
      });
      for (const fId of followerIds) {
        await User.findByIdAndUpdate(fId, {
          $addToSet: { following: createdUsers[i]._id },
        });
      }
    }

    // Add favorites for buyer
    const buyerUser = createdUsers[6]; // Test Buyer

    // 3. Seed products
    console.log("🛍️  Seeding products...");
    const createdProducts = [];
    for (const p of demoProducts) {
      const product = await Product.create({
        ...p,
        seller: createdUsers[p.sellerIndex]._id,
        sellerIndex: undefined,
      });
      createdProducts.push(product);
    }
    console.log(`   Created ${createdProducts.length} products`);

    // Add favorites to buyer
    const favProductIds = createdProducts.slice(0, 6).map((p) => p._id);
    await User.findByIdAndUpdate(buyerUser._id, { favorites: favProductIds });

    // 4. Seed orders & reviews
    console.log("📦 Seeding orders & reviews...");
    let orderCount = 0;
    let reviewCount = 0;

    for (let i = 0; i < 8; i++) {
      const product = createdProducts[i % createdProducts.length];
      const buyerIdx =
        product.seller.toString() === createdUsers[6]._id.toString() ? 0 : 6;
      const buyer = createdUsers[buyerIdx];

      const order = await Order.create({
        buyer: buyer._id,
        seller: product.seller,
        product: product._id,
        quantity: 1,
        unitPrice: product.price,
        shippingPrice: product.shipping.freeShipping
          ? 0
          : product.shipping.price,
        platformFee: product.price * 0.1,
        totalPrice:
          product.price +
          (product.shipping.freeShipping ? 0 : product.shipping.price),
        status: "delivered",
        shippingAddress: {
          street: "123 Main St",
          city: "Chicago",
          state: "IL",
          zip: "60601",
          country: "US",
        },
        statusHistory: [
          {
            status: "pending",
            timestamp: new Date(Date.now() - 14 * 86400000),
            note: "Order created",
          },
          {
            status: "paid",
            timestamp: new Date(Date.now() - 13 * 86400000),
            note: "Payment confirmed",
          },
          {
            status: "shipped",
            timestamp: new Date(Date.now() - 10 * 86400000),
            note: "Shipped via USPS",
          },
          {
            status: "delivered",
            timestamp: new Date(Date.now() - 7 * 86400000),
            note: "Delivered",
          },
        ],
        trackingNumber: `USPS${1000000 + i}`,
      });
      orderCount++;

      // Create review
      const reviewTemplate = reviewTemplates[i % reviewTemplates.length];
      await Review.create({
        reviewer: buyer._id,
        seller: product.seller,
        product: product._id,
        order: order._id,
        ...reviewTemplate,
      });
      reviewCount++;
    }
    console.log(`   Created ${orderCount} orders and ${reviewCount} reviews`);

    // 5. Seed some pending/active orders
    console.log("🔄 Seeding active orders...");
    const activeStatuses = ["pending", "paid", "shipped"];
    for (let i = 0; i < 3; i++) {
      const product = createdProducts[8 + i];
      await Order.create({
        buyer: buyerUser._id,
        seller: product.seller,
        product: product._id,
        quantity: 1,
        unitPrice: product.price,
        shippingPrice: product.shipping.freeShipping
          ? 0
          : product.shipping.price,
        platformFee: product.price * 0.1,
        totalPrice:
          product.price +
          (product.shipping.freeShipping ? 0 : product.shipping.price),
        status: activeStatuses[i],
        shippingAddress: {
          street: "456 Oak Ave",
          city: "Chicago",
          state: "IL",
          zip: "60602",
          country: "US",
        },
        statusHistory: [
          { status: activeStatuses[i], timestamp: new Date(), note: "" },
        ],
      });
    }

    // 6. Seed conversations
    console.log("💬 Seeding conversations...");
    const conv1 = await Conversation.create({
      participants: [buyerUser._id, createdUsers[0]._id],
      product: createdProducts[0]._id,
      lastMessage: {
        text: "Is this still available?",
        sender: buyerUser._id,
        createdAt: new Date(),
      },
    });

    const messages1 = [
      {
        conversation: conv1._id,
        sender: buyerUser._id,
        text: "Hi! I love this necklace. Is it still available?",
        readBy: [buyerUser._id, createdUsers[0]._id],
      },
      {
        conversation: conv1._id,
        sender: createdUsers[0]._id,
        text: "Yes it is! Would you like to know anything about it?",
        readBy: [buyerUser._id, createdUsers[0]._id],
      },
      {
        conversation: conv1._id,
        sender: buyerUser._id,
        text: "How long is the chain? And can it be customized?",
        readBy: [buyerUser._id, createdUsers[0]._id],
      },
      {
        conversation: conv1._id,
        sender: createdUsers[0]._id,
        text: "The chain is 18 inches, but I can make it 16 or 20 inches at no extra cost! Just let me know when you order.",
        readBy: [buyerUser._id, createdUsers[0]._id],
      },
      {
        conversation: conv1._id,
        sender: buyerUser._id,
        text: "That's perfect! I'll order the 20 inch version. Thank you!",
        readBy: [buyerUser._id],
      },
    ];
    await Message.insertMany(
      messages1.map((m, i) => ({
        ...m,
        createdAt: new Date(Date.now() - (5 - i) * 3600000),
      })),
    );

    const conv2 = await Conversation.create({
      participants: [buyerUser._id, createdUsers[3]._id],
      product: createdProducts[7]._id,
      lastMessage: {
        text: "Can I pick up tomorrow?",
        sender: buyerUser._id,
        createdAt: new Date(),
      },
    });
    await Message.insertMany([
      {
        conversation: conv2._id,
        sender: buyerUser._id,
        text: "Hey! I'm interested in the floating shelves. Can I do local pickup?",
        readBy: [buyerUser._id, createdUsers[3]._id],
        createdAt: new Date(Date.now() - 7200000),
      },
      {
        conversation: conv2._id,
        sender: createdUsers[3]._id,
        text: "Absolutely! I'm in Williamsburg. When works for you?",
        readBy: [buyerUser._id, createdUsers[3]._id],
        createdAt: new Date(Date.now() - 5400000),
      },
      {
        conversation: conv2._id,
        sender: buyerUser._id,
        text: "Can I pick up tomorrow around 2pm?",
        readBy: [buyerUser._id],
        createdAt: new Date(Date.now() - 3600000),
      },
    ]);

    // 7. Seed notifications
    console.log("🔔 Seeding notifications...");
    await Notification.insertMany([
      {
        recipient: buyerUser._id,
        type: "order",
        title: "Order Delivered",
        body: "Your Hammered Gold Crescent Moon Necklace has been delivered!",
        data: {},
        isRead: true,
        createdAt: new Date(Date.now() - 7 * 86400000),
      },
      {
        recipient: buyerUser._id,
        type: "order",
        title: "Order Shipped",
        body: "Your Ceramic Planter Set is on its way!",
        data: {},
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        recipient: buyerUser._id,
        type: "message",
        title: "New Message",
        body: "Emma Woodcraft sent you a message",
        data: { conversationId: conv1._id },
        isRead: false,
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        recipient: buyerUser._id,
        type: "follow",
        title: "New Follower",
        body: "Sofia Rivera started following you",
        data: {},
        isRead: false,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        recipient: buyerUser._id,
        type: "price_drop",
        title: "Price Drop!",
        body: "Mid-Century Teak Danish Desk Lamp is now $185 (was $250)",
        data: { productId: createdProducts[3]._id },
        isRead: false,
        createdAt: new Date(Date.now() - 43200000),
      },
      {
        recipient: createdUsers[0]._id,
        type: "order",
        title: "New Order!",
        body: "You have a new order for Hammered Gold Crescent Moon Necklace",
        data: {},
        isRead: false,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        recipient: createdUsers[0]._id,
        type: "review",
        title: "New Review",
        body: "A buyer left a 5-star review on your necklace",
        data: {},
        isRead: false,
        createdAt: new Date(Date.now() - 43200000),
      },
    ]);

    // Update category product counts
    for (const cat of categories) {
      const count = await Product.countDocuments({ category: cat.name });
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        { productCount: count },
      );
    }

    console.log("\n🎉 Seed complete! Here are the demo accounts:\n");
    console.log("┌───────────────────────┬──────────────────┬──────────────┐");
    console.log("│ Name                  │ Email            │ Password     │");
    console.log("├───────────────────────┼──────────────────┼──────────────┤");
    demoUsers.forEach((u) => {
      console.log(
        `│ ${u.name.padEnd(21)} │ ${u.email.padEnd(16)} │ ${DEMO_PASSWORD.padEnd(12)} │`,
      );
    });
    console.log("└───────────────────────┴──────────────────┴──────────────┘");
    console.log(
      "\nLogin with buyer@demo.com / password123 to see a buyer's view",
    );
    console.log(
      "Login with emma@demo.com / password123 to see a seller's view\n",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
};

seed();
