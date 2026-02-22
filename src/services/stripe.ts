import { Alert } from "react-native";
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";
import api from "./api";

// PASTE YOUR PUBLISHABLE KEY HERE
// Find it at: https://dashboard.stripe.com/test/apikeys
// It starts with pk_test_51Hi8ty... (same account prefix as your secret key)
export const STRIPE_PUBLISHABLE_KEY = "pk_test_51Hi8tyGUorDgGElyJqVhSTNLC2QCWSUMajMw9H08Qd0GWosrgwaY3pAztk3EVTuXvoBbI5VLUuA5zJxQN9MJZbdz00Cfws97ns";

class StripeService {
  /**
   * Full Stripe Payment Sheet checkout flow:
   * 1. Backend creates PaymentIntent with your sk_test_ key
   * 2. Mobile receives clientSecret
   * 3. Stripe SDK shows native payment sheet (card, Apple Pay, Google Pay)
   * 4. On success, backend confirms and updates order status to "paid"
   */
  async checkout(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Create payment intent on backend -> returns clientSecret
      const { clientSecret, paymentIntentId } = await api.createPaymentIntent(orderId);

      if (!clientSecret) {
        return { success: false, error: "Failed to create payment" };
      }

      // 2. Initialize the payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Artisan Market",
        style: "alwaysDark",
        returnURL: "artisanmarket://payment-complete",
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        console.error("Stripe init error:", initError);
        return { success: false, error: initError.message };
      }

      // 3. Present the native payment sheet to the user
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          return { success: false, error: "Payment cancelled" };
        }
        console.error("Stripe present error:", presentError);
        return { success: false, error: presentError.message };
      }

      // 4. Payment succeeded on Stripe side - confirm on backend
      await api.confirmPayment(orderId, paymentIntentId);

      return { success: true };
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      return { success: false, error: error.message || "Payment failed" };
    }
  }

  // Set up Stripe Connect for sellers
  async setupSellerAccount(): Promise<{ url: string } | null> {
    try {
      const res = await api.setupStripeConnect();
      return { url: res.url };
    } catch (error: any) {
      Alert.alert("Error", error.message);
      return null;
    }
  }

  // Get seller Stripe balance
  async getSellerBalance(): Promise<any> {
    try {
      const res = await api.getBalance();
      return res.balance;
    } catch {
      return null;
    }
  }
}

export default new StripeService();
