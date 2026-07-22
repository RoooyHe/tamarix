import { getContext, setContext } from "svelte";
import type { MatrixClient, Room, MatrixEvent, IRoomTimelineData } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import type { Comment, Attachment } from "$lib/matrix/types";
import { getMsgType } from "$lib/file-service";
import { onTimelineEvent } from "$lib/matrix/timeline-bus";
import { t } from "$lib/i18n";

const COMMENTS_CONTEXT_KEY = "tamarix:comments";

const MEDIA_MSGTYPES = ["m.image", "m.file", "m.video", "m.audio"];

/**
 * Parse a Matrix room message event into a Comment (with attachments).
 */
function parseMessageEvent(event: MatrixEvent): Comment {
  const content = event.getContent();
  const msgtype = content.msgtype as string | undefined;

  const attachments: Attachment[] = [];

  // Extract attachment from media messages
  if (msgtype && MEDIA_MSGTYPES.includes(msgtype) && content.url) {
    attachments.push({
      eventId: event.getId() ?? "",
      fileName: (content.body as string) ?? "file",
      mimeType: content.info?.mimetype ?? "application/octet-stream",
      size: content.info?.size ?? 0,
      mxcUrl: content.url as string,
      thumbnailMxcUrl: content.info?.thumbnail_url as string | undefined,
      thumbnailInfo: content.info?.thumbnail_info
        ? {
            w: (content.info.thumbnail_info.w ?? content.info.thumbnail_info.width ?? 0) as number,
            h: (content.info.thumbnail_info.h ?? content.info.thumbnail_info.height ?? 0) as number,
            mimetype: (content.info.thumbnail_info.mimetype ?? "image/png") as string,
            size: (content.info.thumbnail_info.size ?? 0) as number
          }
        : undefined,
      uploadedBy: event.getSender() ?? "unknown",
      uploadedAt: event.getTs()
    });
  }

  return {
    eventId: event.getId() ?? "",
    sender: event.getSender() ?? "unknown",
    content: (content.body as string) ?? "",
    timestamp: event.getTs(),
    attachments: attachments.length > 0 ? attachments : undefined
  };
}

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
        .map(parseMessageEvent);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_comments");
    } finally {
      isLoading = false;
    }
  }

  function startListening(client: MatrixClient, roomId: string) {
    stopListening();

    cleanup = onTimelineEvent((event, room_, toStartOfTimeline) => {
      if (!room_ || room_.roomId !== roomId) return;
      if (event.getType() !== EventType.RoomMessage) return;
      if (toStartOfTimeline) return;

      const newComment = parseMessageEvent(event);
      comments = [...comments, newComment];
    });
  }

  function stopListening() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }

  /**
   * Send a file message to the room after uploading.
   */
  async function sendFileMessage(
    client: MatrixClient,
    roomId: string,
    file: File,
    mxcUrl: string
  ) {
    const msgtype = getMsgType(file.type);
    await client.sendMessage(roomId, {
      msgtype,
      body: file.name,
      url: mxcUrl,
      info: {
        mimetype: file.type,
        size: file.size
      }
    } as unknown as RoomMessageEventContent);
  }

  return {
    get comments() { return comments; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    loadComments,
    startListening,
    stopListening,
    sendFileMessage
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
