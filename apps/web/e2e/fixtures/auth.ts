import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { APIRequestContext, FullConfig } from "@playwright/test";
import { request } from "@playwright/test";

type Role = "CUSTOMER" | "PROVIDER";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authDir = path.resolve(__dirname, "../.auth");

export const CUSTOMER_STORAGE_STATE_PATH = path.resolve(authDir, "customer.json");
export const PROVIDER_STORAGE_STATE_PATH = path.resolve(authDir, "provider.json");

const DEFAULT_PASSWORD = "LoadTest1!";

function getWebBaseUrl(config: FullConfig): string {
  const fromUse = config.projects[0]?.use?.baseURL;
  return (typeof fromUse === "string" && fromUse) || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
}

function getApiBaseUrl(): string {
  return process.env.PLAYWRIGHT_API_BASE_URL || "http://localhost:8000";
}

function makeEmail(role: Role): string {
  return `e2e_${role.toLowerCase()}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}@example.com`;
}

export async function registerUserViaApi(
  api: APIRequestContext,
  role: Role,
): Promise<{ email: string; password: string; accessToken: string }> {
  const email = makeEmail(role);
  const password = DEFAULT_PASSWORD;
  const response = await api.post(`${getApiBaseUrl()}/auth/register`, {
    data: {
      email,
      password,
      display_name: `E2E ${role}`,
      role,
    },
  });
  if (!response.ok()) {
    throw new Error(`Failed to register ${role} user. Status: ${response.status()}`);
  }
  const body = (await response.json()) as { access_token: string };
  return { email, password, accessToken: body.access_token };
}

async function writeStorageState(webBaseUrl: string, accessToken: string, targetPath: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const origin = new URL(webBaseUrl).origin;
  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: "access_token", value: accessToken }],
      },
    ],
  };
  await fs.writeFile(targetPath, JSON.stringify(state, null, 2), "utf-8");
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const webBaseUrl = getWebBaseUrl(config);
  const api = await request.newContext({ baseURL: getApiBaseUrl() });
  try {
    const customer = await registerUserViaApi(api, "CUSTOMER");
    await writeStorageState(webBaseUrl, customer.accessToken, CUSTOMER_STORAGE_STATE_PATH);

    const provider = await registerUserViaApi(api, "PROVIDER");
    await writeStorageState(webBaseUrl, provider.accessToken, PROVIDER_STORAGE_STATE_PATH);
  } finally {
    await api.dispose();
  }
}
