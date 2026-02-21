import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

interface AuthSocket extends Socket {
  userId?: string;
}

let io: Server;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Auth middleware
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.userId!;
    console.log(`🔌 User connected: ${userId}`);

    // Join personal room
    socket.join(userId);

    // Join a conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // New message — broadcast to conversation room
    socket.on("send_message", (data: { conversationId: string; message: any }) => {
      socket.to(`conv:${data.conversationId}`).emit("new_message", data.message);
    });

    // Typing indicator
    socket.on("typing", (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit("user_typing", data);
    });

    // Stop typing
    socket.on("stop_typing", (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit("user_stop_typing", data);
    });

    // Mark messages as read
    socket.on("mark_read", (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit("messages_read", data);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });

  return io;
};

// Send notification to specific user via socket
export const sendToUser = (userId: string, event: string, data: any): void => {
  if (io) {
    io.to(userId).emit(event, data);
  }
};

export const getIO = (): Server => io;
