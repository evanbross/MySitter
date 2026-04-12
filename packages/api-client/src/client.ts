import type {
  ApiError,
  Availability,
  AvailabilityCreate,
  AvailabilityUpdate,
  Booking,
  BookingCreate,
  Conversation,
  Message,
  MessageCreate,
  PaginatedResponse,
  PasskeyAuthenticationOptions,
  PasskeyRegistrationOptions,
  ProviderProfile,
  ProviderProfileUpdate,
  ProviderSearchResult,
  Review,
  ReviewCreate,
  SubscribeRequest,
  SubscribeResponse,
  Subscription,
  TokenPair,
  User,
  UserCreate,
  UserUpdate,
} from "@mysitter/types";

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => string | null;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | null;
  private readonly onUnauthorized?: () => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getAccessToken = config.getAccessToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isPublic = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!isPublic) {
      const token = this.getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include", // sends httpOnly refresh token cookie
    });

    if (response.status === 401) {
      this.onUnauthorized?.();
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}`,
      }));
      throw new ApiClientError(response.status, error);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  auth = {
    register: (data: UserCreate) =>
      this.request<TokenPair>("POST", "/auth/register", data, true),

    login: (email: string, password: string, totp_code?: string) =>
      this.request<TokenPair>(
        "POST",
        "/auth/login",
        { email, password, totp_code },
        true,
      ),

    refresh: () =>
      this.request<TokenPair>("POST", "/auth/refresh", undefined, true),

    logout: () => this.request<void>("POST", "/auth/logout"),

    getPasskeyRegistrationOptions: () =>
      this.request<PasskeyRegistrationOptions>(
        "GET",
        "/auth/passkey/registration-options",
      ),

    verifyPasskeyRegistration: (credential: unknown) =>
      this.request<{ verified: boolean }>(
        "POST",
        "/auth/passkey/register",
        credential,
      ),

    getPasskeyAuthOptions: (email: string) =>
      this.request<PasskeyAuthenticationOptions>(
        "POST",
        "/auth/passkey/auth-options",
        { email },
        true,
      ),

    verifyPasskeyAuth: (credential: unknown) =>
      this.request<TokenPair>(
        "POST",
        "/auth/passkey/authenticate",
        credential,
        true,
      ),

    setupTotp: () =>
      this.request<{ secret: string; qr_code_url: string }>(
        "POST",
        "/auth/totp/setup",
      ),

    verifyTotp: (code: string) =>
      this.request<{ verified: boolean }>("POST", "/auth/totp/verify", {
        code,
      }),
  };

  // ─── Users ─────────────────────────────────────────────────────────────────

  users = {
    me: () => this.request<User>("GET", "/users/me"),
    update: (data: UserUpdate) => this.request<User>("PATCH", "/users/me", data),
  };

  // ─── Providers ────────────────────────────────────────────────────────────

  providers = {
    search: (params: {
      lat: number;
      lng: number;
      radius_miles?: number;
      service_type?: string;
      page?: number;
    }) => {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return this.request<PaginatedResponse<ProviderSearchResult>>(
        "GET",
        `/providers/search?${qs}`,
        undefined,
        true,
      );
    },

    getProfile: (providerId: string) =>
      this.request<ProviderProfile>(
        "GET",
        `/providers/${providerId}`,
        undefined,
        true,
      ),

    getMyProfile: () =>
      this.request<ProviderProfile>("GET", "/providers/me"),

    updateMyProfile: (data: ProviderProfileUpdate) =>
      this.request<ProviderProfile>("PATCH", "/providers/me", data),

    getAvailability: (providerId: string) =>
      this.request<Availability[]>(
        "GET",
        `/providers/${providerId}/availability`,
        undefined,
        true,
      ),

    createAvailability: (data: AvailabilityCreate) =>
      this.request<Availability>("POST", "/providers/me/availability", data),

    updateAvailability: (availabilityId: string, data: AvailabilityUpdate) =>
      this.request<Availability>("PATCH", `/providers/me/availability/${availabilityId}`, data),

    deleteAvailability: (availabilityId: string) =>
      this.request<void>("DELETE", `/providers/me/availability/${availabilityId}`),
  };

  // ─── Bookings ─────────────────────────────────────────────────────────────

  bookings = {
    create: (data: BookingCreate) =>
      this.request<Booking>("POST", "/bookings", data),

    list: (params?: { status?: string; page?: number }) => {
      const qs = params
        ? "?" +
          new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)]),
          ).toString()
        : "";
      return this.request<PaginatedResponse<Booking>>("GET", `/bookings${qs}`);
    },

    get: (bookingId: string) =>
      this.request<Booking>("GET", `/bookings/${bookingId}`),

    confirm: (bookingId: string) =>
      this.request<Booking>("POST", `/bookings/${bookingId}/confirm`),

    cancel: (bookingId: string) =>
      this.request<Booking>("POST", `/bookings/${bookingId}/cancel`),

    review: (bookingId: string, data: ReviewCreate) =>
      this.request<Review>("POST", `/bookings/${bookingId}/review`, data),
  };

  // ─── Billing ──────────────────────────────────────────────────────────────

  billing = {
    subscribe: (data: SubscribeRequest) =>
      this.request<SubscribeResponse>("POST", "/billing/subscribe", data),

    getPortalUrl: (returnUrl: string) =>
      this.request<{ url: string }>(
        "GET",
        `/billing/portal?return_url=${encodeURIComponent(returnUrl)}`,
      ),

    getSubscription: () =>
      this.request<Subscription | null>("GET", "/billing/subscription"),
  };

  // ─── Messaging ────────────────────────────────────────────────────────────

  messages = {
    listConversations: () =>
      this.request<Conversation[]>("GET", "/conversations"),

    getConversation: (conversationId: string) =>
      this.request<Conversation>("GET", `/conversations/${conversationId}`),

    getMessages: (conversationId: string, params?: { before?: string }) => {
      const qs = params?.before
        ? `?before=${params.before}`
        : "";
      return this.request<PaginatedResponse<Message>>(
        "GET",
        `/conversations/${conversationId}/messages${qs}`,
      );
    },

    send: (conversationId: string, data: MessageCreate) =>
      this.request<Message>(
        "POST",
        `/conversations/${conversationId}/messages`,
        data,
      ),

    startConversation: (providerId: string) =>
      this.request<Conversation>("POST", "/conversations", { provider_id: providerId }),
  };
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(
      typeof error.detail === "string"
        ? error.detail
        : error.detail.map((e) => e.msg).join(", "),
    );
    this.name = "ApiClientError";
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
