/**
 * Tamarix AS -- Matrix bot REST client
 */

import { createLogger } from "./logger.js";

const log = createLogger("bot");

type MatrixContent = Record<string, unknown>;

interface CreateRoomOptions {
  invite?: string[];
  is_direct?: boolean;
  visibility?: "private" | "public";
  preset?: string;
  name?: string;
  topic?: string;
}

interface BotConfig {
  homeserverUrl: string;
  asToken: string;
  userId: string;
}

export class MatrixBotClient {
  private readonly homeserverUrl: string;
  private readonly asToken: string;
  private readonly userId: string;
  private joinedRooms = new Set<string>();

  constructor(config: BotConfig) {
    this.homeserverUrl = config.homeserverUrl.replace(/\/$/, "");
    this.asToken = config.asToken;
    this.userId = config.userId;
  }

  async start(): Promise<void> {
    await this.refreshJoinedRooms();
    log.info(`Bot joined-room cache initialized with ${this.joinedRooms.size} room(s)`);
  }

  getJoinedRooms(): string[] {
    return [...this.joinedRooms];
  }

  async refreshJoinedRooms(): Promise<string[]> {
    try {
      const response = await this.request<{ joined_rooms?: string[] }>("GET", "/_matrix/client/v3/joined_rooms");
      this.joinedRooms = new Set(response.joined_rooms ?? []);
    } catch (err) {
      log.warn(`Failed to refresh joined rooms: ${err}`);
      this.joinedRooms = new Set();
    }
    return this.getJoinedRooms();
  }

  async sendMessage(roomId: string, content: MatrixContent): Promise<string> {
    const txnId = createTxnId();
    const response = await this.request<{ event_id: string }>(
      "PUT",
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
      content
    );
    return response.event_id;
  }

  async sendStateEvent(
    roomId: string,
    eventType: string,
    stateKey: string,
    content: MatrixContent
  ): Promise<string> {
    const response = await this.request<{ event_id: string }>(
      "PUT",
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/${encodeURIComponent(eventType)}/${encodeURIComponent(stateKey)}`,
      content
    );
    return response.event_id;
  }

  async getRoomStateEvent<T = unknown>(roomId: string, eventType: string, stateKey = ""): Promise<T> {
    return await this.request<T>(
      "GET",
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/${encodeURIComponent(eventType)}/${encodeURIComponent(stateKey)}`
    );
  }

  async getRoomState(roomId: string): Promise<Array<MatrixContent & { type?: string; state_key?: string }>> {
    return await this.request<Array<MatrixContent & { type?: string; state_key?: string }>>(
      "GET",
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state`
    );
  }

  async getJoinedRoomMembers(roomId: string): Promise<Record<string, MatrixContent>> {
    const response = await this.request<{ joined?: Record<string, MatrixContent> }>(
      "GET",
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`
    );
    return response.joined ?? {};
  }

  async joinRoom(roomId: string): Promise<string> {
    const response = await this.request<{ room_id: string }>(
      "POST",
      `/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
      {}
    );
    this.joinedRooms.add(response.room_id);
    return response.room_id;
  }

  async createRoom(options: CreateRoomOptions): Promise<string> {
    const response = await this.request<{ room_id: string }>("POST", "/_matrix/client/v3/createRoom", options);
    this.joinedRooms.add(response.room_id);
    return response.room_id;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.homeserverUrl);
    url.searchParams.set("access_token", this.asToken);
    url.searchParams.set("user_id", this.userId);

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.asToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${method} ${path} failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`);
    }

    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }
}

let botClient: MatrixBotClient | null = null;

export function createBot(config: BotConfig): MatrixBotClient {
  return new MatrixBotClient(config);
}

export function initBot(client: MatrixBotClient): void {
  botClient = client;
  log.info("Bot client initialized");
}

export function getBot(): MatrixBotClient {
  if (!botClient) {
    throw new Error("Bot not initialized. Call initBot() first.");
  }
  return botClient;
}

export async function sendNotice(roomId: string, body: string, htmlBody?: string): Promise<string> {
  const content: MatrixContent = {
    msgtype: "m.notice",
    body
  };
  if (htmlBody) {
    content.format = "org.matrix.custom.html";
    content.formatted_body = htmlBody;
  }
  return getBot().sendMessage(roomId, content);
}

export async function sendText(roomId: string, body: string): Promise<string> {
  return getBot().sendMessage(roomId, {
    msgtype: "m.text",
    body
  });
}

export async function sendStateEvent(
  roomId: string,
  eventType: string,
  stateKey: string,
  content: MatrixContent
): Promise<string> {
  return getBot().sendStateEvent(roomId, eventType, stateKey, content);
}

export async function getStateEvent<T = unknown>(
  roomId: string,
  eventType: string,
  stateKey = ""
): Promise<T | null> {
  try {
    return await getBot().getRoomStateEvent<T>(roomId, eventType, stateKey);
  } catch {
    return null;
  }
}

export async function ensureJoined(roomId: string): Promise<void> {
  try {
    await getBot().joinRoom(roomId);
    log.info(`Bot joined room: ${roomId}`);
  } catch {
    // Already joined or not joinable by the AS bot.
  }
}

export function getJoinedRooms(): string[] {
  return getBot().getJoinedRooms();
}

function createTxnId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
