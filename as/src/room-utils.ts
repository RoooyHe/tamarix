/**
 * Tamarix AS -- Room Utilities
 *
 * Shared functions for reading room state metadata.
 * Used by discovery and state-handlers to resolve parent project Spaces.
 */

import { type MatrixClient, getBot } from "./bot.js";

/**
 * Resolve the parent project Space for a task room.
 * Reads m.space.parent state event or falls back to full room state scan.
 */
export async function resolveProjectParent(
  roomId: string,
  client?: MatrixClient
): Promise<string> {
  const bot = client ?? getBot();
  try {
    const roomState = await bot.getRoomState(roomId);
    const parentEvent = roomState.find(
      (e) => e.type === "m.space.parent" && typeof e.state_key === "string"
    );
    return (parentEvent?.state_key as string) ?? "";
  } catch {
    return "";
  }
}
