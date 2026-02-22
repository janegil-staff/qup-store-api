import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    const baseUrl = API_BASE_URL.replace("/api", "");
    this.socket = io(baseUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit("join_conversation", conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit("leave_conversation", conversationId);
  }

  sendMessage(conversationId: string, message: any): void {
    this.socket?.emit("send_message", { conversationId, message });
  }

  startTyping(conversationId: string, userId: string): void {
    this.socket?.emit("typing", { conversationId, userId });
  }

  stopTyping(conversationId: string, userId: string): void {
    this.socket?.emit("stop_typing", { conversationId, userId });
  }

  markRead(conversationId: string, userId: string): void {
    this.socket?.emit("mark_read", { conversationId, userId });
  }

  onNewMessage(callback: (message: any) => void): void {
    this.socket?.on("new_message", callback);
  }

  onTyping(callback: (data: { conversationId: string; userId: string }) => void): void {
    this.socket?.on("user_typing", callback);
  }

  onStopTyping(callback: (data: { conversationId: string; userId: string }) => void): void {
    this.socket?.on("user_stop_typing", callback);
  }

  onMessagesRead(callback: (data: { conversationId: string; userId: string }) => void): void {
    this.socket?.on("messages_read", callback);
  }

  onNotification(callback: (notification: any) => void): void {
    this.socket?.on("notification", callback);
  }

  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

export default new SocketService();
