import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: any;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

class ApiService {
  private async getToken(): Promise<string | null> {
    return AsyncStorage.getItem("token");
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, noAuth = false } = options;

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (!noAuth) {
      const token = await this.getToken();
      if (token) {
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }

    if (body) {
      config.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      // Try token refresh on 401
      if (res.status === 401 && !noAuth) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options);
        }
      }
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  async uploadImages(images: { uri: string; type: string; name: string }[]): Promise<string[]> {
    const token = await this.getToken();
    const formData = new FormData();

    images.forEach((img) => {
      formData.append("images", {
        uri: img.uri,
        type: img.type || "image/jpeg",
        name: img.name || "photo.jpg",
      } as any);
    });

    const res = await fetch(`${API_BASE_URL}/upload/images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data.urls;
  }

  async uploadAvatar(image: { uri: string; type: string; name: string }): Promise<string> {
    const token = await this.getToken();
    const formData = new FormData();

    formData.append("image", {
      uri: image.uri,
      type: image.type || "image/jpeg",
      name: image.name || "avatar.jpg",
    } as any);

    const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data.url;
  }

  // ─── Auth ────────────────────────────────────────────────────────
  login = (email: string, password: string) =>
    this.request("/auth/login", { method: "POST", body: { email, password }, noAuth: true });

  register = (name: string, email: string, password: string) =>
    this.request("/auth/register", { method: "POST", body: { name, email, password }, noAuth: true });

  getMe = () => this.request("/auth/me");

  logout = () => this.request("/auth/logout", { method: "POST" });

  forgotPassword = (email: string) =>
    this.request("/auth/forgot-password", { method: "POST", body: { email }, noAuth: true });

  // ─── Users ───────────────────────────────────────────────────────
  updateProfile = (data: any) => this.request("/users/profile", { method: "PUT", body: data });
  changePassword = (currentPassword: string, newPassword: string) =>
    this.request("/users/password", { method: "PUT", body: { currentPassword, newPassword } });
  searchUsers = (q: string) => this.request(`/users/search?q=${q}`);
  getUserProfile = (id: string) => this.request(`/users/${id}/profile`);
  followUser = (id: string) => this.request(`/users/${id}/follow`, { method: "POST" });

  // ─── Products ────────────────────────────────────────────────────
  getProducts = (params?: string) => this.request(`/products${params ? `?${params}` : ""}`);
  getProduct = (id: string) => this.request(`/products/${id}`);
  createProduct = (data: any) => this.request("/products", { method: "POST", body: data });
  updateProduct = (id: string, data: any) => this.request(`/products/${id}`, { method: "PUT", body: data });
  deleteProduct = (id: string) => this.request(`/products/${id}`, { method: "DELETE" });
  getSellerProducts = (id: string, params?: string) =>
    this.request(`/products/seller/${id}${params ? `?${params}` : ""}`);
  toggleFavorite = (id: string) => this.request(`/products/${id}/favorite`, { method: "POST" });
  getFavorites = () => this.request("/products/favorites");

  // ─── Orders ──────────────────────────────────────────────────────
  createOrder = (data: any) => this.request("/orders", { method: "POST", body: data });
  getOrders = (params?: string) => this.request(`/orders${params ? `?${params}` : ""}`);
  getSales = (params?: string) => this.request(`/orders/sales${params ? `?${params}` : ""}`);
  getOrder = (id: string) => this.request(`/orders/${id}`);
  updateOrderStatus = (id: string, status: string, note?: string) =>
    this.request(`/orders/${id}/status`, { method: "PATCH", body: { status, note } });
  addTracking = (id: string, trackingNumber: string) =>
    this.request(`/orders/${id}/tracking`, { method: "PATCH", body: { trackingNumber } });
  cancelOrder = (id: string) => this.request(`/orders/${id}/cancel`, { method: "POST" });

  // ─── Reviews ─────────────────────────────────────────────────────
  createReview = (data: any) => this.request("/reviews", { method: "POST", body: data });
  getSellerReviews = (id: string) => this.request(`/reviews/seller/${id}`);
  getProductReviews = (id: string) => this.request(`/reviews/product/${id}`);

  // ─── Conversations ───────────────────────────────────────────────
  getConversations = () => this.request("/conversations");
  createConversation = (data: any) => this.request("/conversations", { method: "POST", body: data });
  getConversation = (id: string) => this.request(`/conversations/${id}`);
  sendMessage = (id: string, data: any) =>
    this.request(`/conversations/${id}/messages`, { method: "POST", body: data });
  sendOffer = (id: string, amount: number) =>
    this.request(`/conversations/${id}/offer`, { method: "POST", body: { amount } });

  // ─── Payments ────────────────────────────────────────────────────
  createPaymentIntent = (orderId: string) =>
    this.request("/payments/intent", { method: "POST", body: { orderId } });
  confirmPayment = (orderId: string, paymentIntentId: string) =>
    this.request("/payments/confirm", { method: "POST", body: { orderId, paymentIntentId } });
  setupStripeConnect = () => this.request("/payments/connect", { method: "POST" });
  getBalance = () => this.request("/payments/balance");

  // ─── Categories ──────────────────────────────────────────────────
  getCategories = () => this.request("/categories");

  // ─── Notifications ───────────────────────────────────────────────
  getNotifications = () => this.request("/notifications");
  readAllNotifications = () => this.request("/notifications/read-all", { method: "PATCH" });
  readNotification = (id: string) => this.request(`/notifications/${id}/read`, { method: "PATCH" });
  registerPushToken = (token: string) =>
    this.request("/notifications/push-token", { method: "POST", body: { token } });

  // ─── AI ──────────────────────────────────────────────────────────
  aiSearch = (query: string) => this.request("/ai/search", { method: "POST", body: { query } });
  aiRecommendations = () => this.request("/ai/recommendations");
  aiDescribe = (data: any) => this.request("/ai/describe", { method: "POST", body: data });
}

export default new ApiService();
