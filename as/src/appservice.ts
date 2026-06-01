/**
 * Tamarix AS -- Matrix Application Service HTTP adapter
 */

import { createLogger } from "./logger.js";

const log = createLogger("appservice");

export interface MatrixEvent {
  type?: string;
  room_id?: string;
  sender?: string;
  state_key?: string;
  event_id?: string;
  content?: Record<string, unknown>;
  unsigned?: {
    prev_content?: Record<string, unknown>;
  };
  prev_content?: Record<string, unknown>;
}

interface TransactionBody {
  events?: MatrixEvent[];
}

interface AppServiceConfig {
  hsToken: string;
  homeserverDomain: string;
  botUserId: string;
}

type EventHandler = (event: MatrixEvent) => Promise<void> | void;

const processedTransactions = new Set<string>();
const handlers = new Map<string, Set<EventHandler>>();

let config: AppServiceConfig = {
  hsToken: "",
  homeserverDomain: "localhost",
  botUserId: "@tamarix-bot:localhost"
};

export function initAppService(nextConfig: AppServiceConfig): void {
  config = nextConfig;
}

export function onAppServiceEvent(eventType: string, handler: EventHandler): void {
  const list = handlers.get(eventType) ?? new Set<EventHandler>();
  list.add(handler);
  handlers.set(eventType, list);
}

export async function handleAppServiceRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = stripAppPrefix(url.pathname);
  if (!path) return null;

  if (!verifyHomeserverToken(request, url)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method === "PUT" && path.startsWith("/transactions/")) {
    const txnId = decodeURIComponent(path.slice("/transactions/".length));
    return await handleTransaction(txnId, request);
  }

  if (request.method === "GET" && path.startsWith("/users/")) {
    const userId = decodeURIComponent(path.slice("/users/".length));
    return matchesAppServiceUser(userId) ? Response.json({}) : Response.json({ error: "Not found" }, { status: 404 });
  }

  if (request.method === "GET" && path.startsWith("/rooms/")) {
    const alias = decodeURIComponent(path.slice("/rooms/".length));
    return matchesAppServiceAlias(alias) ? Response.json({}) : Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handleTransaction(txnId: string, request: Request): Promise<Response> {
  if (processedTransactions.has(txnId)) {
    return Response.json({});
  }

  const body = await request.json().catch(() => ({})) as TransactionBody;
  for (const event of body.events ?? []) {
    await dispatchEvent(event);
  }

  processedTransactions.add(txnId);
  if (processedTransactions.size > 1000) {
    const oldest = processedTransactions.values().next().value as string | undefined;
    if (oldest) processedTransactions.delete(oldest);
  }

  return Response.json({});
}

async function dispatchEvent(event: MatrixEvent): Promise<void> {
  const eventType = event.type;
  if (!eventType) return;

  const exactHandlers = handlers.get(eventType) ?? new Set<EventHandler>();
  const genericHandlers = handlers.get("event") ?? new Set<EventHandler>();

  for (const handler of [...exactHandlers, ...genericHandlers]) {
    try {
      await handler(event);
    } catch (err) {
      log.error(`Error handling ${eventType}: ${err}`);
    }
  }
}

function verifyHomeserverToken(request: Request, url: URL): boolean {
  if (!config.hsToken) return true;

  const queryToken = url.searchParams.get("access_token");
  if (queryToken === config.hsToken) return true;

  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${config.hsToken}`;
}

function stripAppPrefix(pathname: string): string | null {
  const prefixes = ["/_matrix/app/v1", "/_matrix/app/unstable"];
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) return pathname.slice(prefix.length) || "/";
  }
  if (pathname.startsWith("/transactions/") || pathname.startsWith("/users/") || pathname.startsWith("/rooms/")) {
    return pathname;
  }
  return null;
}

function matchesAppServiceUser(userId: string): boolean {
  if (userId === config.botUserId) return true;
  return new RegExp(`^@tamarix_.*:${escapeRegExp(config.homeserverDomain)}$`).test(userId);
}

function matchesAppServiceAlias(alias: string): boolean {
  return new RegExp(`^#tamarix_.*:${escapeRegExp(config.homeserverDomain)}$`).test(alias);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
