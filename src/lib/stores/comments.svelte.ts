import { getContext, setContext } from "svelte";
import type { MatrixClient, Room, MatrixEvent, IRoomTimelineData } from "matrix-js-sdk";
import { RoomEvent, EventType } from "matrix-js-sdk";
import type { Comment } from "$lib/matrix/types";

const COMMENTS_CONTEXT_KEY = "tamarix:comments";

function createCommentsState() {
  let comments = $state<Comment[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let cleanup: (() => void) | null = null;

  function loadComments(client: MatrixClient, roomId: string) {
    isLoading = true;
    error = null;
    try {
      const room = client.getRoom(roomId);
      if (!room) {
        comments = [];
        return;
      }
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      comments = events
        .filter(e => e.getType() === EventType.RoomMessage)
        .map(e => ({
          eventId: e.getId() ?? "",
          sender: e.getSender() ?? "unknown",
          content: (e.getContent().body as string) ?? "",
          timestamp: e.getTs()
        }));
    } catch (e) {
      error = e instanceof Error ? e.message : "加载评论失败";
    } finally {
      isLoading = false;
    }
  }

  function startListening(client: MatrixClient, roomId: string) {
    stopListening();
    const room = client.getRoom(roomId);
    if (!room) return;

    const handler = (event: MatrixEvent, room_: Room | undefined, toStartOfTimeline: boolean | undefined, removed: boolean, data: IRoomTimelineData) => {
      if (!room_ || room_.roomId !== roomId) return;
      if (event.getType() !== EventType.RoomMessage) return;
      // Only add new events (not from initial sync/pagination)
      if (toStartOfTimeline) return;

      const newComment: Comment = {
        eventId: event.getId() ?? "",
        sender: event.getSender() ?? "unknown",
        content: (event.getContent().body as string) ?? "",
        timestamp: event.getTs()
      };
      comments = [...comments, newComment];
    };

    client.on(RoomEvent.Timeline, handler);
    cleanup = () => client.removeListener(RoomEvent.Timeline, handler);
  }

  function stopListening() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }

  return {
    get comments() { return comments; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    loadComments,
    startListening,
    stopListening
  };
}

export type CommentsStore = ReturnType<typeof createCommentsState>;

export function setCommentsContext() {
  const comments = createCommentsState();
  setContext(COMMENTS_CONTEXT_KEY, comments);
  return comments;
}

export function getCommentsContext(): CommentsStore {
  return getContext<CommentsStore>(COMMENTS_CONTEXT_KEY);
}
