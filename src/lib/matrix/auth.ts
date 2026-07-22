import {
  createClient,
  AutoDiscovery,
  AutoDiscoveryAction,
  type ClientConfig,
  type LoginFlow,
  type ILoginFlowsResponse,
  type RegisterRequest,
  type RegisterResponse
} from "matrix-js-sdk";
import { persistCredentials } from "./client-manager";
import { getMatrixErrorData } from "./errors";
import { parseUiaSession, type UiaSession } from "./uia";

const SSO_STATE_KEY = "tamarix.sso_state";

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

export async function registerWithPassword(
  options: RegistrationOptions,
  onRegistered?: (creds: { baseUrl: string; accessToken: string; userId: string; deviceId: string }) => Promise<void>
): Promise<RegistrationResult> {
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
    return await handleRegistrationResponse(options.baseUrl, response, onRegistered);
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
  response: RegisterResponse,
  onRegistered?: (creds: { baseUrl: string; accessToken: string; userId: string; deviceId: string }) => Promise<void>
): Promise<RegistrationResult> {
  if (!response.access_token || !response.device_id) {
    return { kind: "inhibit_login", userId: response.user_id };
  }

  const creds = {
    baseUrl,
    accessToken: response.access_token,
    userId: response.user_id,
    deviceId: response.device_id
  };

  persistCredentials(creds);

  if (onRegistered) {
    await onRegistered(creds);
  }

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

  sessionStorage.setItem(SSO_STATE_KEY, JSON.stringify(state));
  sessionStorage.setItem("tamarix.sso_base_url", baseUrl);
  return state;
}

export function consumeSsoLoginState(expectedState?: string | null): SsoLoginState | null {
  const raw = sessionStorage.getItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_STATE_KEY);

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