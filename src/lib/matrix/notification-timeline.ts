import type { MatrixClient } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
import type { NotificationType } from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";
import { getWatchers } from "./watchers";
import { onTimelineEvent } from "./timeline-bus";

type AddNotificationFn = (type: NotificationType, taskId: string, taskTitle: string, triggeredBy: string) => void;

/**
 * Start listening for timeline events to auto-generate notifications.
 * Monitors status changes, assignments, and mentions for the current user.
 * Returns a cleanup function.
 */
export function startNotificationListener(
  client: MatrixClient,
  addNotification: AddNotificationFn
): () => void {
  const myUserId = client.getUserId();

  return onTimelineEvent((event, room, toStartOfTimeline) => {
    if (!room || toStartOfTimeline) return;
    if (!myUserId) return;

    const sender = event.getSender()!;
    const eventType = event.getType();

    // Status change notification — for watchers (including current user if watching)
    if (eventType === TAMARIX_EVENT_TYPES.TASK_STATUS) {
      const watchers = getWatchers(room);
      if (watchers.includes(myUserId) && sender !== myUserId) {
        addNotification("status_change", room.roomId, room.name, sender);
      }
    }

    // Assignee notification — notify the newly assigned user
    if (eventType === TAMARIX_EVENT_TYPES.ASSIGNEE) {
      const content = event.getContent();
      const assignedUser = content.user_id as string | undefined;
      if (assignedUser === myUserId && sender !== myUserId) {
        addNotification("assign", room.roomId, room.name, sender);
      }
    }

    // Mention notification — when someone mentions the current user in a message
    if (eventType === EventType.RoomMessage) {
      const content = event.getContent();
      const body = (content.body as string) ?? "";
      if (body.includes(myUserId) && sender !== myUserId) {
        addNotification("mention", room.roomId, room.name, sender);
      }
    }
  });
}
