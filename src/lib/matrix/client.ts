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

/**
 * Register a callback that fires on each sync update (PREPARED or SYNCING).
 * This allows stores to refresh their data from the SDK when new data arrives.
 * Returns a cleanup function to remove the listener.
 */
export function onSyncUpdate(client: MatrixClient, callback: () => void): () => void {
  const handler = (state: string) => {
    if (state === "PREPARED" || state === "SYNCING") {
      callback();
    }
  };
  client.on(ClientEvent.Sync, handler);
  return () => client.removeListener(ClientEvent.Sync, handler);
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
