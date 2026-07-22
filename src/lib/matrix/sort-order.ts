import type { Room, MatrixClient } from "matrix-js-sdk";
import type { SortOrderState } from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";
import { getStateEvent, sendStateEvent } from "./state-primitives";

export async function setSortOrder(
  client: MatrixClient,
  taskRoomId: string,
  order: string
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.SORT_ORDER, { order });
}

export function getSortOrder(room: Room): string | null {
  const content = getStateEvent<SortOrderState>(room, TAMARIX_EVENT_TYPES.SORT_ORDER);
  return content?.order ?? null;
}
