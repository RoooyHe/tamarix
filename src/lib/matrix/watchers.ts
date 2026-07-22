import type { Room, MatrixClient } from "matrix-js-sdk";
import { TAMARIX_EVENT_TYPES } from "./types";
import { sendStateEvent } from "./state-primitives";

export function getWatchers(room: Room): string[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.WATCHER as any);
  return events
    .map(e => {
      const content = e.getContent();
      return (content.user_id ?? e.getStateKey() ?? "") as string;
    })
    .filter(id => id.startsWith("@"));
}

export async function addWatcher(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WATCHER, { user_id: userId }, userId);
}

export async function removeWatcher(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WATCHER, {}, userId);
}
