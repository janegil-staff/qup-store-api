import { Router } from "express";
import { auth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import * as authCtrl from "../controllers/auth.controller.js";
import * as userCtrl from "../controllers/user.controller.js";
import * as productCtrl from "../controllers/product.controller.js";
import * as orderCtrl from "../controllers/order.controller.js";
import * as reviewCtrl from "../controllers/review.controller.js";
import * as conversationCtrl from "../controllers/conversation.controller.js";
import * as paymentCtrl from "../controllers/payment.controller.js";
import * as categoryCtrl from "../controllers/category.controller.js";
import * as notificationCtrl from "../controllers/notification.controller.js";
import * as uploadCtrl from "../controllers/upload.controller.js";
import * as aiCtrl from "../controllers/ai.controller.js";

const router = Router();

// ─── Health Check ────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Auth ────────────────────────────────────────────────────────────
router.post("/auth/register", authCtrl.register);
router.post("/auth/login", authCtrl.login);
router.post("/auth/refresh", authCtrl.refresh);
router.get("/auth/me", auth, authCtrl.getMe);
router.post("/auth/logout", auth, authCtrl.logout);
router.post("/auth/forgot-password", authCtrl.forgotPassword);
router.post("/auth/reset-password", authCtrl.resetPassword);

// ─── Users ───────────────────────────────────────────────────────────
router.put("/users/profile", auth, userCtrl.updateProfile);
router.put("/users/password", auth, userCtrl.changePassword);
router.get("/users/search", auth, userCtrl.searchUsers);
router.delete("/users/account", auth, userCtrl.deleteAccount);
router.get("/users/:id/profile", auth, userCtrl.getUserProfile);
router.post("/users/:id/follow", auth, userCtrl.followUser);

// ─── Products ────────────────────────────────────────────────────────
router.get("/products", auth, productCtrl.getAll);
router.get("/products/favorites", auth, productCtrl.getFavorites);
router.get("/products/seller/:id", auth, productCtrl.getBySeller);
router.get("/products/:id", auth, productCtrl.getById);
router.post("/products", auth, productCtrl.create);
router.put("/products/:id", auth, productCtrl.update);
router.delete("/products/:id", auth, productCtrl.remove);
router.post("/products/:id/favorite", auth, productCtrl.toggleFavorite);

// ─── Orders ──────────────────────────────────────────────────────────
router.post("/orders", auth, orderCtrl.create);
router.get("/orders", auth, orderCtrl.getOrders);
router.get("/orders/sales", auth, orderCtrl.getSales);
router.get("/orders/:id", auth, orderCtrl.getById);
router.patch("/orders/:id/status", auth, orderCtrl.updateStatus);
router.patch("/orders/:id/tracking", auth, orderCtrl.addTracking);
router.post("/orders/:id/cancel", auth, orderCtrl.cancel);

// ─── Reviews ─────────────────────────────────────────────────────────
router.post("/reviews", auth, reviewCtrl.create);
router.get("/reviews/seller/:id", auth, reviewCtrl.getSellerReviews);
router.get("/reviews/product/:id", auth, reviewCtrl.getProductReviews);

// ─── Conversations / Chat ────────────────────────────────────────────
router.get("/conversations", auth, conversationCtrl.getAll);
router.post("/conversations", auth, conversationCtrl.create);
router.get("/conversations/:id", auth, conversationCtrl.getById);
router.post("/conversations/:id/messages", auth, conversationCtrl.sendMessage);
router.post("/conversations/:id/offer", auth, conversationCtrl.sendOffer);

// ─── Payments (Stripe) ──────────────────────────────────────────────
router.post("/payments/intent", auth, paymentCtrl.createPaymentIntent);
router.post("/payments/confirm", auth, paymentCtrl.confirmPayment);
router.post("/payments/connect", auth, paymentCtrl.setupConnect);
router.get("/payments/balance", auth, paymentCtrl.getBalance);

// ─── Categories ──────────────────────────────────────────────────────
router.get("/categories", categoryCtrl.getAll);

// ─── Notifications ───────────────────────────────────────────────────
router.get("/notifications", auth, notificationCtrl.getAll);
router.patch("/notifications/read-all", auth, notificationCtrl.readAll);
router.patch("/notifications/:id/read", auth, notificationCtrl.readOne);
router.delete("/notifications/:id", auth, notificationCtrl.remove);
router.post("/notifications/push-token", auth, notificationCtrl.registerPushToken);

// ─── Upload ──────────────────────────────────────────────────────────
router.post("/upload/images", auth, upload.array("images", 10), uploadCtrl.uploadImages);
router.post("/upload/avatar", auth, upload.single("image"), uploadCtrl.uploadAvatar);
router.delete("/upload/image", auth, uploadCtrl.deleteImage);

// ─── AI ──────────────────────────────────────────────────────────────
router.post("/ai/search", auth, aiCtrl.search);
router.get("/ai/recommendations", auth, aiCtrl.recommendations);
router.post("/ai/describe", auth, aiCtrl.describe);

// ─── Admin ────────────────────
import * as adminCtrl from "../controllers/admin.controller.js";
router.get("/admin/users", auth, adminCtrl.requireAdmin, adminCtrl.getUsers);
router.patch("/admin/users/:id/ban", auth, adminCtrl.requireAdmin, adminCtrl.banUser);
router.patch("/admin/users/:id/unban", auth, adminCtrl.requireAdmin, adminCtrl.unbanUser);
router.get("/admin/products", auth, adminCtrl.requireAdmin, adminCtrl.getAdminProducts);
router.delete("/admin/products/:id", auth, adminCtrl.requireAdmin, adminCtrl.removeProduct);
router.get("/admin/orders/stats", auth, adminCtrl.requireAdmin, adminCtrl.getOrderStats);

export default router;
