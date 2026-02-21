import { Expo, ExpoPushMessage } from "expo-server-sdk";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendToUser } from "../socket/index.js";

const expo = new Expo();

interface NotificationPayload {
  recipientId: string;
  type: "order" | "message" | "review" | "follow" | "price_drop" | "offer" | "system";
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    // Save to database
    const notification = await Notification.create({
      recipient: payload.recipientId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    });

    // Send via socket (real-time)
    sendToUser(payload.recipientId, "notification", notification);

    // Send push notification
    const user = await User.findById(payload.recipientId);
    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      const message: ExpoPushMessage = {
        to: user.pushToken,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      };

      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error("Push notification error:", error);
        }
      }
    }
  } catch (error) {
    console.error("Notification error:", error);
  }
};
