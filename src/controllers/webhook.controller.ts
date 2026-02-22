import { Request, Response } from "express";
import stripe from "../config/stripe.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import { sendPushNotification } from "../services/push.service.js";
import User from "../models/User.js";
import env from "../config/env.js";

/**
 * Stripe Webhook Handler
 *
 * This handles events sent by Stripe when payments succeed/fail.
 * Much more reliable than client-side confirmation alone.
 *
 * Setup:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Run: stripe listen --forward-to localhost:5000/api/payments/webhook
 * 3. Copy the webhook signing secret (whsec_...) to your .env as STRIPE_WEBHOOK_SECRET
 *
 * For production:
 * 1. Go to https://dashboard.stripe.com/webhooks
 * 2. Add endpoint: https://your-server.com/api/payments/webhook
 * 3. Select events: payment_intent.succeeded, payment_intent.payment_failed
 * 4. Copy signing secret to your env
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;

  let event;

  try {
    if (env.STRIPE_WEBHOOK_SECRET) {
      // Verify webhook signature (recommended for production)
      event = stripe.webhooks.constructEvent(
        req.body, // Must be raw body, not parsed JSON
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } else {
      // No webhook secret configured — parse event directly (dev only)
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.status === "pending") {
          order.status = "paid";
          order.statusHistory.push({
            status: "paid",
            timestamp: new Date(),
            note: "Payment confirmed via Stripe webhook",
          });
          await order.save();

          // Notify seller
          const seller = await User.findById(order.seller);
          if (seller) {
            await Notification.create({
              recipient: seller._id,
              type: "order",
              title: "New Order! 💰",
              body: `You have a new paid order worth $${order.totalPrice.toFixed(2)}`,
              data: { orderId: order._id },
            });

            if (seller.pushToken) {
              await sendPushNotification(
                seller.pushToken,
                "New Order! 💰",
                `You have a new paid order worth $${order.totalPrice.toFixed(2)}`,
                { orderId: order._id.toString() },
              ).catch(() => {});
            }
          }

          // Notify buyer
          const buyer = await User.findById(order.buyer);
          if (buyer) {
            await Notification.create({
              recipient: buyer._id,
              type: "order",
              title: "Payment Confirmed",
              body: "Your payment was successful! The seller has been notified.",
              data: { orderId: order._id },
            });

            if (buyer.pushToken) {
              await sendPushNotification(
                buyer.pushToken,
                "Payment Confirmed ✅",
                "Your payment was successful!",
                { orderId: order._id.toString() },
              ).catch(() => {});
            }
          }

          console.log(`✅ Order ${orderId} marked as paid via webhook`);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      const errorMessage =
        paymentIntent.last_payment_error?.message || "Payment failed";

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.statusHistory.push({
            status: order.status,
            timestamp: new Date(),
            note: `Payment failed: ${errorMessage}`,
          });
          await order.save();
          console.log(
            `❌ Payment failed for order ${orderId}: ${errorMessage}`,
          );
        }
      }
      break;
    }

    case "account.updated": {
      // Stripe Connect account updated (seller onboarding complete)
      const account = event.data.object;
      if (account.charges_enabled && account.payouts_enabled) {
        const user = await User.findOne({ stripeConnectId: account.id });
        if (user) {
          console.log(`✅ Seller ${user.name} Stripe Connect fully enabled`);
        }
      }
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  // Return 200 to acknowledge receipt
  res.json({ received: true });
};
