import { createClient, type MatrixClient, ClientEvent, Filter } from "matrix-js-sdk";

let client: MatrixClient | null = null;
const INITIAL_SYNC_LIMIT = 5;
const START_CLIENT_TIMEOUT_MS = 60000;

/**
 * Get or create the Matrix client singleton.
 * Must call initClient() first after login.
 */
export function getClient(): MatrixClient {
  if (!client) {
    throw new Error("Matrix client not initialized. Call initClient() first.");
  }
  return client;
}

/**
 * Check if client is initialized.
 */
export function hasClient(): boolean {
  return client !== null;
}

/**
 * Initialize a new Matrix client with stored access token and device ID.
 */
export function initClient({
  baseUrl,
  accessToken,
  userId,
  deviceId
}: {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId?: string;
}): MatrixClient {
  client = createClient({
    baseUrl,
    accessToken,
    userId,
    deviceId: deviceId ?? "TAMARIX_DEVICE",
    timelineSupport: true
  });

  return client;
}

interface StartClientOptions {
  timeoutMs?: number;
}

function createSyncFilter(client: MatrixClient): Filter {
  const filter = new Filter(client.getUserId());
  filter.setTimelineLimit(INITIAL_SYNC_LIMIT);
  filter.setIncludeLeaveRooms(false);
  filter.setLazyLoadMembers(true);
  filter.setUnreadThreadNotifications(true);
  return filter;
}

/**
 * Start the client sync loop with V3-compliant options.
 * Resolves when the client reaches an initial usable sync state.
 */
export async function startClient(options: StartClientOptions = {}): Promise<void> {
  const c = getClient();
  const timeoutMs = options.timeoutMs ?? START_CLIENT_TIMEOUT_MS;
  
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
    c.startClient({
      initialSyncLimit: INITIAL_SYNC_LIMIT,
      includeArchivedRooms: false,
      filter: createSyncFilter(c),
      lazyLoadMembers: true,
      threadSupport: true,
      disablePresence: true
    });
  });
}

interface SyncUpdateOptions {
  debounceMs?: number;
  immediatePrepared?: boolean;
}

/**
 * Register a callback that fires on sync updates (PREPARED or SYNCING).
 * Sync can be noisy, so callbacks are debounced by default.
 */
export function onSyncUpdate(
  client: MatrixClient,
  callback: () => void,
  options: SyncUpdateOptions = {}
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

/**
 * Stop the client sync and clear the singleton.
 */
export async function stopClient(): Promise<void> {
  if (client) {
    await client.stopClient();
    client = null;
  }
}
