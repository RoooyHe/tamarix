import type { Room, MatrixClient } from "matrix-js-sdk";
import type { WorklogEntry } from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";
import { sendStateEvent } from "./state-primitives";

export function getWorklogs(room: Room): WorklogEntry[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.WORKLOG as any);
  return events
    .map(e => {
      const content = e.getContent();
      return {
        userId: content.user_id ?? e.getStateKey() ?? "",
        hours: content.hours ?? 0,
        note: content.note ?? "",
        loggedAt: content.logged_at ?? 0
      } as WorklogEntry;
    })
    .filter(e => e.hours > 0)
    .sort((a, b) => b.loggedAt - a.loggedAt);
}

export async function addWorklog(
  client: MatrixClient,
  roomId: string,
  entry: WorklogEntry
): Promise<void> {
  const stateKey = `${entry.userId}_${entry.loggedAt}`;
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WORKLOG, {
    user_id: entry.userId,
    hours: entry.hours,
    note: entry.note ?? "",
    logged_at: entry.loggedAt
  }, stateKey);
}

export async function removeWorklog(
  client: MatrixClient,
  roomId: string,
  stateKey: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WORKLOG, {}, stateKey);
}
