import { Response } from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";

// GET /api/conversations
export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await Conversation.find({
      participants: req.user!._id,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "name avatar")
      .populate("product", "title images price");

    sendSuccess(res, { conversations });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/conversations
export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipientId, productId, message } = req.body;

    if (recipientId === req.user!._id.toString()) {
      sendError(res, "Cannot message yourself");
      return;
    }

    // Check if conversation already exists for this product + participants
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user!._id, recipientId] },
      ...(productId && { product: productId }),
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user!._id, recipientId],
        product: productId || undefined,
        lastMessage: {
          text: message,
          sender: req.user!._id,
          createdAt: new Date(),
        },
        unreadCount: new Map([[recipientId, 1]]),
      });
    }

    // Create the first message
    if (message) {
      await Message.create({
        conversation: conversation._id,
        sender: req.user!._id,
        text: message,
        readBy: [req.user!._id],
      });
    }

    const populated = await conversation.populate([
      { path: "participants", select: "name avatar" },
      { path: "product", select: "title images price" },
    ]);

    sendSuccess(res, { conversation: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// GET /api/conversations/:id
export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "name avatar")
      .populate("product", "title images price");

    if (!conversation) {
      sendError(res, "Conversation not found", 404);
      return;
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === req.user!._id.toString()
    );
    if (!isParticipant) {
      sendError(res, "Not authorized", 403);
      return;
    }

    // Get messages
    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .populate("sender", "name avatar");

    // Mark as read
    conversation.unreadCount.set(req.user!._id.toString(), 0);
    await conversation.save();

    await Message.updateMany(
      { conversation: conversation._id, readBy: { $ne: req.user!._id } },
      { $addToSet: { readBy: req.user!._id } }
    );

    sendSuccess(res, { conversation, messages });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/conversations/:id/messages
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text, image } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      sendError(res, "Conversation not found", 404);
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user!._id.toString()
    );
    if (!isParticipant) {
      sendError(res, "Not authorized", 403);
      return;
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user!._id,
      text: text || "",
      image: image || "",
      readBy: [req.user!._id],
    });

    // Update conversation
    conversation.lastMessage = {
      text: text || "📷 Image",
      sender: req.user!._id,
      createdAt: new Date(),
    };

    // Increment unread for other participants
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== req.user!._id.toString()) {
        const current = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), current + 1);
      }
    }
    await conversation.save();

    const populated = await message.populate("sender", "name avatar");
    sendSuccess(res, { message: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// POST /api/conversations/:id/offer
export const sendOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      sendError(res, "Conversation not found", 404);
      return;
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user!._id,
      text: `Offer: $${amount}`,
      offer: { amount, status: "pending" },
      readBy: [req.user!._id],
    });

    conversation.lastMessage = {
      text: `Offer: $${amount}`,
      sender: req.user!._id,
      createdAt: new Date(),
    };
    await conversation.save();

    const populated = await message.populate("sender", "name avatar");
    sendSuccess(res, { message: populated }, 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
