import { createClient, type MatrixClient } from "matrix-js-sdk";
import { initClient, startClient, stopClient, getClient as getRawClient } from "./client";

const STORAGE_KEYS = {
  BASE_URL: "tamarix.base_url",
  ACCESS_TOKEN: "tamarix.access_token",
  USER_ID: "tamarix.user_id",
  DEVICE_ID: "tamarix.device_id"
} as const;

/**
 * Consolidated client lifecycle manager.
 *
 * Wraps the raw client singleton (client.ts) and auth operations (auth.ts)
 * into a small interface: login, restore, logout, and accessors.
 * The auth.svelte.ts store wraps this with Svelte reactivity.
 */
export function createClientManager() {
  let _client: MatrixClient | null = null;
  let _userId: string | null = null;

  // ── Private helpers ──────────────────────────────────────────

  function persistCredentials(opts: {
    baseUrl: string;
    accessToken: string;
    userId: string;
    deviceId: string;
  }) {
    localStorage.setItem(STORAGE_KEYS.BASE_URL, opts.baseUrl);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, opts.accessToken);
    localStorage.setItem(STORAGE_KEYS.USER_ID, opts.userId);
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, opts.deviceId);
  }

  function clearCredentials() {
    localStorage.removeItem(STORAGE_KEYS.BASE_URL);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
  }

  async function initAndStart(opts: {
    baseUrl: string;
    accessToken: string;
    userId: string;
    deviceId: string;
  }) {
    _client = initClient({
      baseUrl: opts.baseUrl,
      accessToken: opts.accessToken,
      userId: opts.userId,
      deviceId: opts.deviceId
    });
    _userId = opts.userId;
    await startClient();
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Login with password, persist credentials, and start the client sync.
   */
  async function login(baseUrl: string, username: string, password: string) {
    const tempClient = createClient({ baseUrl });
    const response = await tempClient.loginRequest({
      type: "m.login.password",
      identifier: { type: "m.id.user", user: username },
      password,
      initial_device_display_name: "Tamarix"
    });

    let resolvedBaseUrl = baseUrl;
    if (response.well_known?.["m.homeserver"]?.base_url) {
      resolvedBaseUrl = response.well_known["m.homeserver"].base_url.replace(/\/+$/, "") + "/";
    }

    persistCredentials({
      baseUrl: resolvedBaseUrl,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id
    });

    await initAndStart({
      baseUrl: resolvedBaseUrl,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id
    });
  }

  /**
   * Login with an SSO token, persist credentials, and start the client sync.
   */
  async function loginWithToken(baseUrl: string, loginToken: string) {
    const tempClient = createClient({ baseUrl });
    const response = await tempClient.loginRequest({
      type: "m.login.token",
      token: loginToken,
      initial_device_display_name: "Tamarix"
    });

    let resolvedBaseUrl = baseUrl;
    if (response.well_known?.["m.homeserver"]?.base_url) {
      resolvedBaseUrl = response.well_known["m.homeserver"].base_url.replace(/\/+$/, "") + "/";
    }

    persistCredentials({
      baseUrl: resolvedBaseUrl,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id
    });

    await initAndStart({
      baseUrl: resolvedBaseUrl,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id
    });
  }

  /**
   * Try to restore a previous session from localStorage.
   * Returns the user ID if successful, or null if no valid session exists.
   */
  async function restore(): Promise<string | null> {
    const baseUrl = localStorage.getItem(STORAGE_KEYS.BASE_URL);
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    const deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!baseUrl || !accessToken || !userId) {
      return null;
    }

    try {
      _client = initClient({
        baseUrl,
        accessToken,
        userId,
        deviceId: deviceId ?? undefined
      });
      _userId = userId;

      const session = await _client.whoami();
      if (session.user_id !== userId) {
        throw new Error("Stored Matrix session user mismatch");
      }

      // Start sync non-blocking (deferred via rAF)
      void startClient({ waitForSync: false }).catch(() => undefined);
      return userId;
    } catch {
      clearCredentials();
      _client = null;
      _userId = null;
      return null;
    }
  }

  /**
   * Logout: stop the client, call the logout API, and clear credentials.
   */
  async function logout() {
    try {
      if (_client) {
        await _client.logout();
      }
    } catch {
      // Ignore logout API errors — we'll clear local state anyway
    } finally {
      await stopClient();
      clearCredentials();
      _client = null;
      _userId = null;
    }
  }

  // ── Accessors ─────────────────────────────────────────────────

  function getClient(): MatrixClient | null {
    return _client;
  }

  function getUserId(): string | null {
    return _userId;
  }

  function hasClient(): boolean {
    return _client !== null;
  }

  return {
    login,
    loginWithToken,
    restore,
    logout,
    getClient,
    getUserId,
    hasClient
  };
}

export type ClientManager = ReturnType<typeof createClientManager>;