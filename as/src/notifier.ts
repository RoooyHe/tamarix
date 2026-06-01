/**
 * Tamarix AS -- Notification Bot
 *
 * Sends Matrix notifications for task events:
 * - Assignment notifications
 * - Status change notifications
 * - Due date reminders (periodic scan)
 * - @mention notifications (non-encrypted rooms only)
 *
 * Notifications are sent as m.room.message (m.notice) to 1:1 rooms
 * with the target user, respecting their notification preferences.
 */

import { getBot, sendNotice, ensureJoined, getStateEvent } from "./bot.js";
import { getDb } from "./db.js";
import { getWatchersForNotification } from "./watcher.js";
import { createLogger } from "./logger.js";

const log = createLogger("notifier");

// Cache of 1:1 room IDs per user to avoid recreating them
const dmRoomCache: Map<string, string> = new Map();

/**
 * Notification preferences structure (mirrors com.tamarix.notification_prefs).
 */
interface NotificationPrefs {
  assign_notify: boolean;
  status_change_notify: boolean;
  due_remind: boolean;
  mention_notify: boolean;
  channels: string[];
}

/**
 * Get a user's notification preferences.
 * Falls back to defaults if not set.
 */
async function getUserNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const defaults: NotificationPrefs = {
    assign_notify: true,
    status_change_notify: true,
    due_remind: true,
    mention_notify: true,
    channels: ["matrix"]
  };

  // Try to find the user's account data or a dedicated room
  // For now, use the defaults. Prefs will be read from account data in future.
  return defaults;
}

/**
 * Create or get a 1:1 DM room with a user for sending notifications.
 */
async function getDmRoom(userId: string): Promise<string> {
  // Check cache first
  const cached = dmRoomCache.get(userId);
  if (cached) return cached;

  const bot = getBot();

  try {
    // Try to find existing DM room
    const joinedRooms = bot.getJoinedRooms();
    for (const roomId of joinedRooms) {
      try {
        const members = await bot.getJoinedRoomMembers(roomId);
        const memberList = Object.keys(members);
        if (memberList.length === 2 && memberList.includes(userId)) {
          dmRoomCache.set(userId, roomId);
          return roomId;
        }
      } catch {
        continue;
      }
    }

    // Create new DM room
    const roomId = await bot.createRoom({
      invite: [userId],
      is_direct: true,
      visibility: "private",
      preset: "trusted_private_chat",
      name: undefined,
      topic: "Tamarix Notifications"
    });

    dmRoomCache.set(userId, roomId);
    log.info(`Created DM room ${roomId} for user ${userId}`);
    return roomId;
  } catch (err) {
    log.error(`Failed to create DM room for ${userId}: ${err}`);
    throw err;
  }
}

/**
 * Send a notification to a specific user via DM.
 */
async function notifyUser(userId: string, body: string, htmlBody?: string): Promise<void> {
  try {
    const dmRoom = await getDmRoom(userId);
    await sendNotice(dmRoom, body, htmlBody);
  } catch (err) {
    log.error(`Failed to notify user ${userId}: ${err}`);
  }
}

/**
 * Handle assignment notification.
 * Called when com.tamarix.assignee changes.
 */
export async function handleAssigneeNotification(
  roomId: string,
  ticketId: string,
  taskTitle: string,
  assigneeId: string,
  assignedBy: string
): Promise<void> {
  if (assigneeId === assignedBy) return; // Self-assignment, skip

  const prefs = await getUserNotificationPrefs(assigneeId);
  if (!prefs.assign_notify) {
    log.debug(`User ${assigneeId} has assign notifications disabled`);
    return;
  }

  const body = `[Tamarix] ${ticketId} ${taskTitle}: assigned to you by ${assignedBy}`;
  const html = `<b>[Tamarix]</b> <code>${ticketId}</code> ${escapeHtml(taskTitle)}: assigned to you by <code>${escapeHtml(assignedBy)}</code>`;

  await notifyUser(assigneeId, body, html);
  log.info(`Sent assignment notification to ${assigneeId} for ${ticketId}`);
}

/**
 * Handle status change notification.
 * Notifies all watchers of the task.
 */
export async function handleStatusNotification(
  roomId: string,
  projectRoomId: string,
  ticketId: string,
  taskTitle: string,
  fromStatus: string,
  toStatus: string,
  changedBy: string
): Promise<void> {
  const watchers = getWatchersForNotification(roomId, projectRoomId);

  for (const watcherId of watchers) {
    if (watcherId === changedBy) continue; // Don't notify the person who made the change

    const prefs = await getUserNotificationPrefs(watcherId);
    if (!prefs.status_change_notify) continue;

    const body = `[Tamarix] ${ticketId} ${taskTitle}: ${fromStatus} -> ${toStatus} by ${changedBy}`;
    const html = `<b>[Tamarix]</b> <code>${ticketId}</code> ${escapeHtml(taskTitle)}: <code>${fromStatus}</code> -> <code>${toStatus}</code> by <code>${escapeHtml(changedBy)}</code>`;

    await notifyUser(watcherId, body, html);
  }

  log.info(`Sent status notifications for ${ticketId} to ${watchers.length} watchers`);
}

/**
 * Scan for due date reminders.
 * Called periodically (every 30 minutes).
 * Finds tasks due within 24h and notifies assignee + watchers.
 */
export async function scanDueDateReminders(): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const rows = db.prepare(`
    SELECT room_id, ticket_id, title, assignee, due_date, project_room_id
    FROM tasks
    WHERE due_date IS NOT NULL
      AND status NOT IN ('done', 'closed')
      AND archived = 0
  `).all() as { room_id: string; ticket_id: string; title: string; assignee: string; due_date: string; project_room_id: string }[];

  for (const task of rows) {
    const dueTime = new Date(task.due_date).getTime();
    const timeUntilDue = dueTime - now;

    if (timeUntilDue > twentyFourHours || timeUntilDue < 0) continue;

    const hoursLeft = Math.round(timeUntilDue / (60 * 60 * 1000));
    const body = `[Tamarix] ${task.ticket_id} ${task.title}: due in ${hoursLeft}h`;
    const html = `<b>[Tamarix]</b> <code>${task.ticket_id}</code> ${escapeHtml(task.title)}: due in <b>${hoursLeft}h</b>`;

    // Notify assignee
    if (task.assignee) {
      const prefs = await getUserNotificationPrefs(task.assignee);
      if (prefs.due_remind) {
        await notifyUser(task.assignee, body, html);
      }
    }

    // Notify watchers
    const watchers = getWatchersForNotification(task.room_id, task.project_room_id);
    for (const watcherId of watchers) {
      if (watcherId === task.assignee) continue;
      const prefs = await getUserNotificationPrefs(watcherId);
      if (prefs.due_remind) {
        await notifyUser(watcherId, body, html);
      }
    }
  }

  log.info("Due date reminder scan completed");
}

/**
 * Handle @mention detection from m.room.message.
 * Only works in non-encrypted rooms.
 */
export async function handleMentionNotification(
  roomId: string,
  sender: string,
  body: string,
  isEncrypted: boolean
): Promise<void> {
  if (isEncrypted) {
    log.debug(`Room ${roomId} is encrypted, skipping @mention detection`);
    return;
  }

  // Match @user:server patterns
  const mentionRegex = /@([a-zA-Z0-9._=-]+):([a-zA-Z0-9.-]+)/g;
  const mentioned: Set<string> = new Set();
  let match;

  while ((match = mentionRegex.exec(body)) !== null) {
    const userId = `@${match[1]}:${match[2]}`;
    if (userId !== sender) {
      mentioned.add(userId);
    }
  }

  if (mentioned.size === 0) return;

  const db = getDb();
  const task = db.prepare("SELECT ticket_id, title, project_room_id FROM tasks WHERE room_id = ?").get(roomId) as any;
  if (!task) return;

  for (const userId of mentioned) {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs.mention_notify) continue;

    const notifBody = `[Tamarix] ${task.ticket_id} ${task.title}: ${sender} mentioned you`;
    const notifHtml = `<b>[Tamarix]</b> <code>${task.ticket_id}</code> ${escapeHtml(task.title)}: <code>${escapeHtml(sender)}</code> mentioned you`;

    await notifyUser(userId, notifBody, notifHtml);
  }

  log.info(`Sent mention notifications to ${mentioned.size} users in room ${roomId}`);
}

/**
 * HTML-escape a string for safe inclusion in formatted_body.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
