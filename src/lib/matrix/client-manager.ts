import { createClient, type MatrixClient, ClientEvent, Filter } from "matrix-js-sdk";

export const STORAGE_KEYS = {
  BASE_URL: "tamarix.base_url",
  ACCESS_TOKEN: "tamarix.access_token",
  USER_ID: "tamarix.user_id",
  DEVICE_ID: "tamarix.device_id"
} as const;

/**
 * Persist Matrix credentials to localStorage.
 */
export function persistCredentials(opts: {
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

// ─── Client lifecycle (moved from client.ts) ──────────────────────

const INITIAL_SYNC_LIMIT = 5;
const START_CLIENT_TIMEOUT_MS = 60000;

function createSyncFilter(c: MatrixClient): Filter {
  const filter = new Filter(c.getUserId());
  filter.setTimelineLimit(INITIAL_SYNC_LIMIT);
  filter.setIncludeLeaveRooms(false);
  filter.setLazyLoadMembers(true);
  filter.setUnreadThreadNotifications(true);
  return filter;
}

function getSyncOptions(c: MatrixClient) {
  return {
    initialSyncLimit: INITIAL_SYNC_LIMIT,
    includeArchivedRooms: false,
    filter: createSyncFilter(c),
    lazyLoadMembers: true,
    threadSupport: true,
    disablePresence: true
  };
}

async function startClientSync(c: MatrixClient, options: { timeoutMs?: number; waitForSync?: boolean } = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? START_CLIENT_TIMEOUT_MS;
  const waitForSync = options.waitForSync ?? true;

  if (!waitForSync) {
    c.startClient(getSyncOptions(c));
    return;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      c.removeListener(ClientEvent.Sync, onSync);
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const onSync = (state: string) => {
      if (state === "PREPARED" || state === "SYNCING") {
        finish(resolve);
      } else if (state === "ERROR") {
        finish(() => reject(new Error("Matrix sync failed")));
      }
    };

    timeout = setTimeout(() => {
      void c.stopClient();
      finish(() => reject(new Error("Matrix sync timed out")));
    }, timeoutMs);

    c.on(ClientEvent.Sync, onSync);
    c.startClient(getSyncOptions(c));
  });
}

/**
 * Register a callback that fires on sync updates (PREPARED or SYNCING).
 * Sync can be noisy, so callbacks are debounced by default.
 */
export function onSyncUpdate(
  client: MatrixClient,
  callback: () => void,
  options: { debounceMs?: number; immediatePrepared?: boolean } = {}
): () => void {
  const debounceMs = options.debounceMs ?? 200;
  const immediatePrepared = options.immediatePrepared ?? true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let preparedFired = false;

  const run = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    callback();
  };

  const handler = (state: string) => {
    if (state !== "PREPARED" && state !== "SYNCING") return;

    if (state === "PREPARED" && immediatePrepared && !preparedFired) {
      preparedFired = true;
      run();
      return;
    }

    if (debounceMs <= 0) {
      run();
      return;
    }

    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(run, debounceMs);
  };

  client.on(ClientEvent.Sync, handler);
  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    client.removeListener(ClientEvent.Sync, handler);
  };
}

// ─── Client Manager ──────────────────────────────────────────────

/**
 * Consolidated client lifecycle manager.
 *
 * Owns the Matrix client lifecycle: login, restore, logout.
 * All credential persistence goes through this module.
 * The auth.svelte.ts store wraps this with Svelte reactivity.
 */
export function createClientManager() {
  let _client: MatrixClient | null = null;
  let _userId: string | null = null;

  function clearCredentials() {
    localStorage.removeItem(STORAGE_KEYS.BASE_URL);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
  }

  function initClient(opts: {
    baseUrl: string;
    accessToken: string;
    userId: string;
    deviceId?: string;
  }): MatrixClient {
    _client = createClient({
      baseUrl: opts.baseUrl,
      accessToken: opts.accessToken,
      userId: opts.userId,
      deviceId: opts.deviceId ?? "TAMARIX_DEVICE",
      timelineSupport: true
    });
    _userId = opts.userId;
    return _client;
  }

  async function initAndStart(opts: {
    baseUrl: string;
    accessToken: string;
    userId: string;
    deviceId: string;
  }) {
    initClient(opts);
    await startClientSync(_client!);
  }

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

  async function restore(): Promise<string | null> {
    const baseUrl = localStorage.getItem(STORAGE_KEYS.BASE_URL);
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    const deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!baseUrl || !accessToken || !userId) {
      return null;
    }

    try {
      initClient({
        baseUrl,
        accessToken,
        userId,
        deviceId: deviceId ?? undefined
      });

      const session = await _client!.whoami();
      if (session.user_id !== userId) {
        throw new Error("Stored Matrix session user mismatch");
      }

      // Start sync non-blocking (deferred via rAF)
      void startClientSync(_client!, { waitForSync: false }).catch(() => undefined);
      return userId;
    } catch {
      clearCredentials();
      _client = null;
      _userId = null;
      return null;
    }
  }

  async function logout() {
    try {
      if (_client) {
        await _client.logout();
      }
    } catch {
      // Ignore logout API errors — we'll clear local state anyway
    } finally {
      if (_client) {
        await _client.stopClient();
      }
      clearCredentials();
      _client = null;
      _userId = null;
    }
  }

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
    initAndStart,
    restore,
    logout,
    getClient,
    getUserId,
    hasClient
  };
}

export type ClientManager = ReturnType<typeof createClientManager>;
