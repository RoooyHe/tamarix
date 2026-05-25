import { getContext, setContext } from "svelte";
import type { MatrixClient } from "matrix-js-sdk";
import { getClient, hasClient } from "$lib/matrix/client";
import { loginWithPassword, restoreSession, logout as matrixLogout } from "$lib/matrix/auth";
import { t } from "$lib/i18n";

const AUTH_CONTEXT_KEY = "tamarix:auth";

interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  client: MatrixClient | null;
  isLoading: boolean;
  error: string | null;
}

function createAuthState() {
  let isLoggedIn = $state(false);
  let userId = $state<string | null>(null);
  let client = $state<MatrixClient | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  /** Login using the discovered base URL from the discovery step */
  async function loginWithDiscoveredUrl(discoveredBaseUrl: string, username: string, password: string) {
    isLoading = true;
    error = null;
    try {
      const result = await loginWithPassword(discoveredBaseUrl, username, password);
      userId = result.userId;
      isLoggedIn = true;
      client = getClient();
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.login_failed");
      isLoggedIn = false;
    } finally {
      isLoading = false;
    }
  }

  /** Legacy login: auto-discovers the base URL from the homeserver domain */
  async function login(baseUrl: string, username: string, password: string) {
    isLoading = true;
    error = null;
    try {
      const result = await loginWithPassword(baseUrl, username, password);
      userId = result.userId;
      isLoggedIn = true;
      client = getClient();
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.login_failed");
      isLoggedIn = false;
    } finally {
      isLoading = false;
    }
  }

  async function restore() {
    isLoading = true;
    error = null;
    try {
      const restoredUserId = await restoreSession();
      if (restoredUserId) {
        userId = restoredUserId;
        isLoggedIn = true;
        client = getClient();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.restore_failed");
    } finally {
      isLoading = false;
    }
  }

  async function logout() {
    try {
      await matrixLogout();
    } catch {
      // Ignore
    }
    isLoggedIn = false;
    userId = null;
    client = null;
  }

  return {
    get isLoggedIn() { return isLoggedIn; },
    get userId() { return userId; },
    get client() { return client; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    login,
    loginWithDiscoveredUrl,
    restore,
    logout
  };
}

export type AuthStore = ReturnType<typeof createAuthState>;

export function setAuthContext() {
  const auth = createAuthState();
  setContext(AUTH_CONTEXT_KEY, auth);
  return auth;
}

export function getAuthContext(): AuthStore {
  return getContext<AuthStore>(AUTH_CONTEXT_KEY);
}
