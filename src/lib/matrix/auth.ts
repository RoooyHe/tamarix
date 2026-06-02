import {
  createClient,
  AutoDiscovery,
  AutoDiscoveryAction,
  type ClientConfig,
  type LoginFlow,
  type ILoginFlowsResponse,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse
} from "matrix-js-sdk";
import { initClient, startClient, stopClient, getClient } from "./client";
import { getMatrixErrorData } from "./errors";
import { parseUiaSession, type UiaSession } from "./uia";

const STORAGE_KEYS = {
  BASE_URL: "tamarix.base_url",
  ACCESS_TOKEN: "tamarix.access_token",
  USER_ID: "tamarix.user_id",
  DEVICE_ID: "tamarix.device_id",
  SSO_STATE: "tamarix.sso_state"
} as const;

export interface RegistrationOptions {
  baseUrl: string;
  username: string;
  password: string;
  auth?: RegisterRequest["auth"];
  inhibitLogin?: boolean;
}

export type RegistrationResult =
  | { kind: "success"; userId: string; accessToken: string; deviceId: string }
  | { kind: "uia"; session: UiaSession }
  | { kind: "inhibit_login"; userId: string };

export interface SsoLoginState {
  id: string;
  baseUrl: string;
  flowType: string;
  idpId?: string;
  redirectTo: string;
  createdAt: number;
}

function startSyncAfterRestore(): void {
  const start = () => {
    void startClient({ waitForSync: false }).catch(() => undefined);
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      setTimeout(start, 0);
    });
    return;
  }

  setTimeout(start, 0);
}

/**
 * Discover the real homeserver base URL via .well-known autodiscovery.
 * If discovery succeeds, returns the resolved base URL.
 * If discovery fails (no .well-known, invalid, etc.), returns the input as-is
 * so the user can still try to connect directly.
 */
export async function discoverHomeserver(domain: string): Promise<string> {
  try {
    // Strip protocol for AutoDiscovery — it expects a domain like "matrix.org"
    let cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    const clientConfig: ClientConfig = await AutoDiscovery.findClientConfig(cleanDomain);
    const hsState = clientConfig["m.homeserver"];

    if (hsState.state === AutoDiscoveryAction.SUCCESS && hsState.base_url) {
      // Ensure trailing slash for consistency
      return hsState.base_url.replace(/\/+$/, "") + "/";
    }
  } catch {
    // AutoDiscovery failed — fall back to using the input URL directly
  }

  // Fallback: treat input as a direct base URL
  return domain.replace(/\/+$/, "") + "/";
}

/**
 * Fetch supported login flows from the homeserver.
 * Used to determine which login methods are available (password, SSO, etc.)
 */
export async function getLoginFlows(baseUrl: string): Promise<LoginFlow[]> {
  const tempClient = createClient({ baseUrl });
  const response: ILoginFlowsResponse = await tempClient.loginFlows();
  return response.flows;
}

export async function checkUsernameAvailable(baseUrl: string, username: string): Promise<boolean> {
  const tempClient = createClient({ baseUrl });
  return await tempClient.isUsernameAvailable(username);
}

export async function registerWithPassword(options: RegistrationOptions): Promise<RegistrationResult> {
  const tempClient = createClient({ baseUrl: options.baseUrl });
  const request: RegisterRequest = {
    username: options.username,
    password: options.password,
    auth: options.auth,
    inhibit_login: options.inhibitLogin ?? false,
    initial_device_display_name: "Tamarix"
  };

  try {
    const response = await tempClient.registerRequest(request);
    return await handleRegistrationResponse(options.baseUrl, response);
  } catch (error) {
    const uiaData = getMatrixErrorData(error);
    const uiaSession = parseUiaSession(uiaData);
    if (uiaSession) {
      return { kind: "uia", session: uiaSession };
    }
    throw error;
  }
}

async function handleRegistrationResponse(
  baseUrl: string,
  response: RegisterResponse
): Promise<RegistrationResult> {
  if (!response.access_token || !response.device_id) {
    return { kind: "inhibit_login", userId: response.user_id };
  }

  persistCredentials({
    baseUrl,
    accessToken: response.access_token,
    userId: response.user_id,
    deviceId: response.device_id
  });

  initClient({
    baseUrl,
    accessToken: response.access_token,
    userId: response.user_id,
    deviceId: response.device_id
  });

  await startClient();

  return {
    kind: "success",
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id
  };
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function createSsoLoginState(
  baseUrl: string,
  flowType: string,
  idpId?: string,
  redirectTo = "/dashboard"
): SsoLoginState {
  const state: SsoLoginState = {
    id: randomId(),
    baseUrl,
    flowType,
    idpId,
    redirectTo,
    createdAt: Date.now()
  };

  sessionStorage.setItem(STORAGE_KEYS.SSO_STATE, JSON.stringify(state));
  sessionStorage.setItem("tamarix.sso_base_url", baseUrl);
  return state;
}

export function consumeSsoLoginState(expectedState?: string | null): SsoLoginState | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS.SSO_STATE);
  sessionStorage.removeItem(STORAGE_KEYS.SSO_STATE);

  if (!raw) return null;

  try {
    const state = JSON.parse(raw) as SsoLoginState;
    const isFresh = Date.now() - state.createdAt < 15 * 60 * 1000;
    const stateMatches = !expectedState || state.id === expectedState;
    if (!isFresh || !stateMatches) return null;
    return state;
  } catch {
    return null;
  }
}

export function buildSsoRedirectUrl({
  baseUrl,
  flowType,
  idpId,
  callbackOrigin,
  redirectTo = "/dashboard"
}: {
  baseUrl: string;
  flowType: string;
  idpId?: string;
  callbackOrigin: string;
  redirectTo?: string;
}): string {
  const state = createSsoLoginState(baseUrl, flowType, idpId, redirectTo);
  const base = baseUrl.replace(/\/+$/, "");
  const callbackUrl = new URL("/login/callback", callbackOrigin);
  callbackUrl.searchParams.set("state", state.id);

  const redirect = new URL(`${base}/_matrix/client/v3/auth/${encodeURIComponent(flowType)}/redirect`);
  redirect.searchParams.set("redirectUrl", callbackUrl.toString());
  if (idpId) {
    redirect.searchParams.set("idp", idpId);
  }

  return redirect.toString();
}

/**
 * Login with username/password using Matrix V3 login API.
 * Uses `identifier` (m.id.user) instead of the deprecated `user` field.
 * Stores credentials and initializes the client.
 */
export async function loginWithPassword(
  baseUrl: string,
  username: string,
  password: string
): Promise<{ userId: string; accessToken: string; deviceId: string }> {
  // Use a temporary client for login
  const tempClient = createClient({ baseUrl });

  // V3-compliant login: use identifier instead of deprecated user field
  const loginRequest: LoginRequest = {
    type: "m.login.password",
    identifier: {
      type: "m.id.user",
      user: username
    },
    password,
    initial_device_display_name: "Tamarix"
  };

  const response: LoginResponse = await tempClient.loginRequest(loginRequest);

  const { user_id, access_token, device_id, well_known } = response;

  // If the server returns well_known, use it to find the real base URL
  let resolvedBaseUrl = baseUrl;
  if (well_known?.["m.homeserver"]?.base_url) {
    resolvedBaseUrl = well_known["m.homeserver"].base_url.replace(/\/+$/, "") + "/";
  }

  // Persist credentials
  persistCredentials({
    baseUrl: resolvedBaseUrl,
    accessToken: access_token,
    userId: user_id,
    deviceId: device_id
  });

  // Initialize real client with the (possibly updated) base URL
  initClient({
    baseUrl: resolvedBaseUrl,
    accessToken: access_token,
    userId: user_id,
    deviceId: device_id
  });

  await startClient();

  return {
    userId: user_id,
    accessToken: access_token,
    deviceId: device_id
  };
}

/**
 * Login with an SSO token using Matrix V3 login API.
 * Called after SSO redirect callback receives a loginToken.
 * Stores credentials and initializes the client.
 */
export async function loginWithToken(
  baseUrl: string,
  loginToken: string
): Promise<{ userId: string; accessToken: string; deviceId: string }> {
  const tempClient = createClient({ baseUrl });

  const loginRequest: LoginRequest = {
    type: "m.login.token",
    token: loginToken,
    initial_device_display_name: "Tamarix"
  };

  const response: LoginResponse = await tempClient.loginRequest(loginRequest);

  const { user_id, access_token, device_id, well_known } = response;

  // If the server returns well_known, use it to find the real base URL
  let resolvedBaseUrl = baseUrl;
  if (well_known?.["m.homeserver"]?.base_url) {
    resolvedBaseUrl = well_known["m.homeserver"].base_url.replace(/\/+$/, "") + "/";
  }

  persistCredentials({
    baseUrl: resolvedBaseUrl,
    accessToken: access_token,
    userId: user_id,
    deviceId: device_id
  });

  initClient({
    baseUrl: resolvedBaseUrl,
    accessToken: access_token,
    userId: user_id,
    deviceId: device_id
  });

  await startClient();

  return {
    userId: user_id,
    accessToken: access_token,
    deviceId: device_id
  };
}

/**
 * Try to restore a previous session from localStorage.
 * Returns null if no valid session found.
 */
export async function restoreSession(): Promise<string | null> {
  const baseUrl = localStorage.getItem(STORAGE_KEYS.BASE_URL);
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  const deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);

  if (!baseUrl || !accessToken || !userId) {
    return null;
  }

  try {
    const client = initClient({ baseUrl, accessToken, userId, deviceId: deviceId ?? undefined });
    const session = await client.whoami();
    if (session.user_id !== userId) {
      throw new Error("Stored Matrix session user mismatch");
    }
    startSyncAfterRestore();
    return userId;
  } catch {
    // Session is invalid, clear it
    clearCredentials();
    return null;
  }
}

/**
 * Logout: stop client and clear stored credentials.
 */
export async function logout(): Promise<void> {
  try {
    const client = getClient();
    await client.logout();
  } catch {
    // Ignore logout API errors — we'll clear local state anyway
  } finally {
    await stopClient();
    clearCredentials();
  }
}

/**
 * Persist credentials to localStorage.
 */
function persistCredentials({
  baseUrl,
  accessToken,
  userId,
  deviceId
}: {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
}): void {
  localStorage.setItem(STORAGE_KEYS.BASE_URL, baseUrl);
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
}

/**
 * Clear stored credentials.
 */
function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEYS.BASE_URL);
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_ID);
  localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
  sessionStorage.removeItem(STORAGE_KEYS.SSO_STATE);
}
