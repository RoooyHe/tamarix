import { createClient, type MatrixClient, ClientEvent } from "matrix-js-sdk";

let client: MatrixClient | null = null;

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

/**
 * Start the client sync loop with V3-compliant options.
 * Returns a promise that resolves when the client is in PREPARED state.
 */
export async function startClient(): Promise<void> {
  const c = getClient();
  
  return new Promise((resolve, reject) => {
    const onSync = (state: string) => {
      if (state === "PREPARED") {
        c.removeListener(ClientEvent.Sync, onSync);
        resolve();
      } else if (state === "ERROR") {
        c.removeListener(ClientEvent.Sync, onSync);
        reject(new Error("Matrix sync failed"));
      }
    };
    
    c.on(ClientEvent.Sync, onSync);
    c.startClient({
      initialSyncLimit: 30,
      threadSupport: true
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
