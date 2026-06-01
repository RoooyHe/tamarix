/**
 * Tamarix AS -- E2EE Guard
 *
 * Detects encrypted rooms and provides functionality degradation.
 * In encrypted rooms, the AS bot cannot read m.room.message content,
 * so features like @mention detection and comment indexing are disabled.
 * State events remain readable as they are not encrypted in the
 * current Matrix E2EE model.
 */

import { getBot, getStateEvent } from "./bot.js";
import { getDb } from "./db.js";
import { setTaskEncrypted } from "./indexer.js";
import { createLogger } from "./logger.js";

const log = createLogger("e2ee-guard");

/**
 * Features that are degraded in encrypted rooms.
 */
export const DEGRADED_FEATURES = {
  MENTION_NOTIFICATION: "mention_notification",
  COMMENT_INDEX: "comment_index",
  ATTACHMENT_INDEX: "attachment_index"
} as const;

export type DegradedFeature = typeof DEGRADED_FEATURES[keyof typeof DEGRADED_FEATURES];

const ALL_DEGRADED_FEATURES: DegradedFeature[] = [
  DEGRADED_FEATURES.MENTION_NOTIFICATION,
  DEGRADED_FEATURES.COMMENT_INDEX,
  DEGRADED_FEATURES.ATTACHMENT_INDEX
];

/**
 * Feature descriptions for API responses and logging.
 */
const FEATURE_DESCRIPTIONS: Record<DegradedFeature, string> = {
  [DEGRADED_FEATURES.MENTION_NOTIFICATION]: "Mention notifications (cannot read encrypted messages)",
  [DEGRADED_FEATURES.COMMENT_INDEX]: "Comment search indexing (cannot read encrypted messages)",
  [DEGRADED_FEATURES.ATTACHMENT_INDEX]: "Attachment search indexing (cannot read encrypted messages)"
};

/**
 * Cache of room encryption status.
 */
const encryptionCache: Map<string, boolean> = new Map();

/**
 * Check if a room is encrypted by looking for m.room.encryption state.
 */
export async function isRoomEncrypted(roomId: string): Promise<boolean> {
  // Check cache
  const cached = encryptionCache.get(roomId);
  if (cached !== undefined) return cached;

  const encryptionState = await getStateEvent<{ algorithm: string }>(roomId, "m.room.encryption");
  const encrypted = !!encryptionState;

  encryptionCache.set(roomId, encrypted);

  if (encrypted) {
    log.info(`Room ${roomId} is encrypted (E2EE)`);
    // Update the index
    setTaskEncrypted(roomId, true);
  }

  return encrypted;
}

/**
 * Mark a room as encrypted (called when m.room.encryption event is detected).
 */
export function markRoomEncrypted(roomId: string): void {
  encryptionCache.set(roomId, true);
  setTaskEncrypted(roomId, true);
  log.info(`Room ${roomId} marked as encrypted`);
}

/**
 * Mark a room as not encrypted.
 */
export function markRoomUnencrypted(roomId: string): void {
  encryptionCache.set(roomId, false);
  setTaskEncrypted(roomId, false);
}

/**
 * Get the list of degraded features for an encrypted room.
 * Returns empty array for non-encrypted rooms.
 */
export async function getDegradedFeatures(roomId: string): Promise<DegradedFeature[]> {
  const encrypted = await isRoomEncrypted(roomId);
  if (!encrypted) return [];
  return [...ALL_DEGRADED_FEATURES];
}

/**
 * Get E2EE status for a room, including degraded feature descriptions.
 * Used by the HTTP API.
 */
export async function getE2eeStatus(roomId: string): Promise<{
  encrypted: boolean;
  degraded_features: Array<{ id: string; description: string }>;
}> {
  const encrypted = await isRoomEncrypted(roomId);
  if (!encrypted) {
    return { encrypted: false, degraded_features: [] };
  }

  return {
    encrypted: true,
    degraded_features: ALL_DEGRADED_FEATURES.map(id => ({
      id,
      description: FEATURE_DESCRIPTIONS[id]
    }))
  };
}
