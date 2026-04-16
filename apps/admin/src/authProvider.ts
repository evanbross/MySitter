import type { AuthProvider } from "react-admin";

const API_URL = import.meta.env.VITE_API_URL as string;

export const authProvider: AuthProvider = {
  login: async ({ username, password }: { username: string; password: string }) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Login failed");
    }
    const { access_token } = await res.json();
    localStorage.setItem("access_token", access_token);
  },

  logout: async () => {
    localStorage.removeItem("access_token");
    // Call the API logout to clear the refresh cookie.
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {}); // ignore errors on logout
  },

  checkAuth: () =>
    localStorage.getItem("access_token")
      ? Promise.resolve()
      : Promise.reject(),

  checkError: (error: { status?: number }) => {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem("access_token");
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getPermissions: async () => {
    // Decode the JWT payload (no signature verification needed client-side).
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role ?? null;
    } catch {
      return null;
    }
  },

  getIdentity: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return undefined;
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return undefined;
    const user = await res.json();
    return { id: user.id, fullName: user.display_name, avatar: user.avatar_url };
  },
};
