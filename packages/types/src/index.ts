// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "PROVIDER" | "CUSTOMER" | "ADMIN";

export type SubscriptionTier = "BASIC" | "PRO" | "PREMIUM";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type ServiceType =
  | "PET_SITTING"
  | "HOUSE_SITTING"
  | "DOG_WALKING"
  | "DROP_IN_VISIT"
  | "DOGGY_DAY_CARE"
  | "BOARDING";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenPair {
  access_token: string;
  token_type: "bearer";
}

export interface PasskeyRegistrationOptions {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  timeout: number;
  attestation: string;
  authenticatorSelection: Record<string, unknown>;
}

export interface PasskeyAuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{ id: string; type: string }>;
  userVerification: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone: string | null;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  totp_enabled: boolean;
  created_at: string; // ISO 8601
}

export interface UserCreate {
  email: string;
  password: string;
  display_name: string;
  phone?: string;
  role: UserRole;
}

export interface UserUpdate {
  display_name?: string;
  phone?: string;
  avatar_url?: string;
}

// ─── Provider Profile ─────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  services: ServiceType[];
  hourly_rate: number | null;
  service_radius_miles: number;
  location: GeoPoint | null;
  is_active: boolean;
  subscription_tier: SubscriptionTier | null;
  rating: number | null;
  review_count: number;
}

export interface ProviderSearchResult extends ProviderProfile {
  distance_miles: number;
}

export interface ProviderProfileUpdate {
  bio?: string;
  services?: ServiceType[];
  hourly_rate?: number;
  service_radius_miles?: number;
  location?: GeoPoint;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface Availability {
  id: string;
  provider_id: string;
  start_at: string; // ISO 8601
  end_at: string;
  rrule_string: string | null; // null = one-time block
}

export interface AvailabilityCreate {
  start_at: string;
  end_at: string;
  rrule_string?: string;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  status: BookingStatus;
  service_type: ServiceType;
  start_at: string;
  end_at: string;
  rrule_string: string | null;
  notes: string | null;
  created_at: string;
}

export interface BookingOccurrence {
  id: string;
  booking_id: string;
  scheduled_at: string;
  status: BookingStatus;
  notes: string | null;
}

export interface BookingCreate {
  provider_id: string;
  service_type: ServiceType;
  start_at: string;
  end_at: string;
  rrule_string?: string;
  notes?: string;
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  customer_id: string;
  provider_id: string;
  other_party: Pick<User, "id" | "display_name" | "avatar_url">;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageCreate {
  body: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsOutgoingMessage {
  type: "message";
  payload: MessageCreate;
}

export interface WsIncomingMessage {
  type: "message" | "error" | "ping";
  payload: Message | { detail: string } | null;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1-5
  body: string | null;
  created_at: string;
}

export interface ReviewCreate {
  rating: number;
  body?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}
