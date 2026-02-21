import mongoose, { Schema, Document, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "order",
  "message",
  "review",
  "follow",
  "price_drop",
  "offer",
  "system",
] as const;

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  body: string;
  data: {
    orderId?: Types.ObjectId;
    productId?: Types.ObjectId;
    conversationId?: Types.ObjectId;
    userId?: Types.ObjectId;
  };
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      orderId: { type: Schema.Types.ObjectId, ref: "Order" },
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
      userId: { type: Schema.Types.ObjectId, ref: "User" },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model<INotification>("Notification", notificationSchema);
