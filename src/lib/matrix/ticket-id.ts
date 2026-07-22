import type { MatrixClient } from "matrix-js-sdk";
import { isTaskRoom } from "./room-utils";
import { getStateEvent } from "./state-primitives";
import { TAMARIX_EVENT_TYPES } from "./types";

const TICKET_ID_REGEX = /^TAM-(\d+)$/;

/**
 * Generate the next ticket ID for a project by scanning existing task rooms.
 * Format: TAM-{n} where n is monotonically increasing per project.
 *
 * @param client - Matrix client instance
 * @param projectRoomId - The Space room ID of the project
 * @returns The next ticket ID string, e.g. "TAM-1" or "TAM-42"
 */
export async function generateNextTicketId(
  client: MatrixClient,
  projectRoomId: string
): Promise<string> {
  const rooms = client.getRooms();

  // Filter task rooms that belong to this project
  const taskRooms = rooms.filter(room => {
    if (!isTaskRoom(room)) return false;
    const parentEvents = room.currentState.getStateEvents("m.space.parent" as any);
    return parentEvents.some((e: any) => e.getStateKey() === projectRoomId);
  });

  // Extract all existing ticket IDs
  let maxNum = 0;
  for (const room of taskRooms) {
    const event = getStateEvent<{ id: string }>(room, TAMARIX_EVENT_TYPES.TICKET_ID);
    if (event?.id) {
      const match = event.id.match(TICKET_ID_REGEX);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  return `TAM-${maxNum + 1}`;
}
