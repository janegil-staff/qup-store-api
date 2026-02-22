import { Response } from "express";
import stripe from "../config/stripe.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import env from "../config/env.js";

// POST /api/payments/intent
export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }
    if (order.buyer.toString() !== req.user!._id.toString()) {
      sendError(res, "Not authorized", 403);
      return;
    }

    // Ensure buyer has a Stripe customer ID
    let customerId = req.user!.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        name: req.user!.name,
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user!._id, { stripeCustomerId: customerId });
    }

    // Get seller's Stripe Connect ID
    const seller = await User.findById(order.seller);
    const sellerConnectId = seller?.stripeConnectId;

    const amountInCents = Math.round(order.totalPrice * 100);
    const platformFeeInCents = Math.round(order.platformFee * 100);

    const paymentIntentParams: any = {
      amount: amountInCents,
      currency: "usd",
      customer: customerId,
      metadata: {
        orderId: order._id.toString(),
        buyerId: req.user!._id.toString(),
        sellerId: order.seller.toString(),
      },
    };

    // If seller has Stripe Connect, use transfer
    if (sellerConnectId) {
      paymentIntentParams.transfer_data = {
        destination: sellerConnectId,
      };
      paymentIntentParams.application_fee_amount = platformFeeInCents;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    sendSuccess(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/payments/confirm
export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      order.status = "paid";
      order.statusHistory.push({
        status: "paid",
        timestamp: new Date(),
        note: "Payment confirmed",
      });
      await order.save();
      sendSuccess(res, { order, paymentStatus: "succeeded" });
    } else {
      sendSuccess(res, { order, paymentStatus: paymentIntent.status });
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/payments/connect
export const setupConnect = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Create a Stripe Connect Express account for the seller
    const account = await stripe.accounts.create({
      type: "express",
      email: req.user!.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await User.findByIdAndUpdate(req.user!._id, {
      stripeConnectId: account.id,
      role: req.user!.role === "buyer" ? "both" : req.user!.role,
    });

    // Use the server URL for return/refresh since mobile deep links may not work with Stripe
    const serverUrl = env.CLIENT_URL.startsWith("http") ? env.CLIENT_URL : `https://${env.CLIENT_URL}`;
    const baseUrl = serverUrl.includes("localhost") ? "https://artisanmarket.com" : serverUrl;

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/seller/onboard/refresh`,
      return_url: `${baseUrl}/seller/onboard/complete`,
      type: "account_onboarding",
    });

    sendSuccess(res, { url: accountLink.url, accountId: account.id });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/payments/balance
export const getBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user!.stripeConnectId) {
      sendError(res, "No Stripe Connect account found");
      return;
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: req.user!.stripeConnectId,
    });

    sendSuccess(res, { balance });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
