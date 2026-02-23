import { Response } from "express";
import stripe from "../config/stripe.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import env from "../config/env.js";

// Zero-decimal currencies (Stripe doesn't multiply by 100)
const ZERO_DECIMAL = ["JPY", "KRW", "VND", "CLP", "PYG", "UGX", "RWF", "BIF", "DJF", "GNF", "MGA", "XOF", "XPF"];

// Convert display amount to Stripe amount (cents/øre/smallest unit)
const toStripeAmount = (amount: number, currency: string): number => {
  if (ZERO_DECIMAL.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
};

// Stripe-supported currencies
const SUPPORTED_CURRENCIES = [
  "nok", "usd", "eur", "gbp", "sek", "dkk", "cad", "aud", "jpy",
  "chf", "pln", "brl", "inr", "mxn", "sgd", "nzd", "hkd",
];

// POST /api/payments/intent
export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, currency: requestedCurrency, countryCode } = req.body;

    const order = await Order.findById(orderId);
    if (!order) { sendError(res, "Order not found", 404); return; }
    if (order.buyer.toString() !== req.user!._id.toString()) { sendError(res, "Not authorized", 403); return; }

    // Determine currency: use requested, or order's, or fallback to NOK
    let currency = (requestedCurrency || order.currency || "nok").toLowerCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) currency = "nok";

    // Ensure buyer has a Stripe customer ID
    let customerId = req.user!.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        name: req.user!.name,
        metadata: { userId: req.user!._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user!._id, { stripeCustomerId: customerId });
    }

    // Create ephemeral key for the customer (enables saved payment methods)
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-12-18.acacia" }
    );

    // Get seller's Stripe Connect ID
    const seller = await User.findById(order.seller);
    const sellerConnectId = seller?.stripeConnectId;

    const amountInSmallest = toStripeAmount(order.totalPrice, currency);
    const platformFeeInSmallest = toStripeAmount(order.platformFee || order.totalPrice * 0.1, currency);

    const paymentIntentParams: any = {
      amount: amountInSmallest,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order._id.toString(),
        buyerId: req.user!._id.toString(),
        sellerId: order.seller.toString(),
        originalCurrency: currency.toUpperCase(),
      },
    };

    // If seller has Stripe Connect, route funds with platform fee
    if (sellerConnectId) {
      paymentIntentParams.transfer_data = {
        destination: sellerConnectId,
      };
      paymentIntentParams.application_fee_amount = platformFeeInSmallest;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Save payment details on order
    order.stripePaymentIntentId = paymentIntent.id;
    order.currency = currency.toUpperCase();
    await order.save();

    sendSuccess(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customerId,
      currency: currency.toUpperCase(),
    });
  } catch (error: any) {
    console.error("Payment intent error:", error);
    sendError(res, error.message, 500);
  }
};

// POST /api/payments/confirm
export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) { sendError(res, "Order not found", 404); return; }

    // For Expo Go testing
    if (paymentIntentId === "expo_go_test") {
      order.status = "paid";
      order.statusHistory.push({ status: "paid", timestamp: new Date(), note: "Test payment (Expo Go)" });
      await order.save();
      sendSuccess(res, { order, paymentStatus: "succeeded" });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      order.status = "paid";
      order.statusHistory.push({
        status: "paid",
        timestamp: new Date(),
        note: `Payment confirmed (${order.currency || "NOK"})`,
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
    const { countryCode } = req.body;

    // Seller's country for Stripe Connect (affects payout currency & bank requirements)
    const country = (countryCode || "NO").toUpperCase();

    // Create or reuse existing Connect account
    let connectId = req.user!.stripeConnectId;

    if (!connectId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: req.user!.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: { userId: req.user!._id.toString() },
      });
      connectId = account.id;

      await User.findByIdAndUpdate(req.user!._id, {
        stripeConnectId: connectId,
        stripeConnectCountry: country,
        role: req.user!.role === "buyer" ? "both" : req.user!.role,
      });
    }

    // Build return/refresh URLs
    const serverUrl = env.CLIENT_URL.startsWith("http") ? env.CLIENT_URL : `https://${env.CLIENT_URL}`;
    const baseUrl = serverUrl.includes("localhost") ? "https://artisanmarket.com" : serverUrl;

    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${baseUrl}/seller/onboard/refresh`,
      return_url: `${baseUrl}/seller/onboard/complete`,
      type: "account_onboarding",
    });

    sendSuccess(res, { url: accountLink.url, accountId: connectId, country });
  } catch (error: any) {
    console.error("Connect setup error:", error);
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
