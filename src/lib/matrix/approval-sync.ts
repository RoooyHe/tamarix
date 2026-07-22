import type { Room, MatrixClient } from "matrix-js-sdk";
import type { ApprovalState, ApprovalStatus } from "./types";
import { getApproval, setApproval } from "./approvals";

/**
 * Count approval/rejection reactions in a room's timeline.
 * Scans all reaction events and deduplicates by sender.
 */
export function countApprovalReactions(room: Room): { approvals: number; rejections: number } {
  const approvals = new Set<string>();
  const rejections = new Set<string>();
  const events = room.getLiveTimeline().getEvents();

  for (const event of events) {
    if (event.getType() !== "m.reaction") continue;
    const content = event.getContent() as { "m.relates_to"?: { key?: string; event_id?: string } };
    const key = content["m.relates_to"]?.key;
    const sender = event.getSender() ?? event.getId() ?? "";
    if (!key) continue;
    if (key === "+1" || key === "👍" || key === "👍️") approvals.add(sender);
    if (key === "-1" || key === "👎" || key === "👎️") rejections.add(sender);
  }

  return { approvals: approvals.size, rejections: rejections.size };
}

/**
 * Compute the next approval status from reaction counts.
 */
export function computeApprovalStatus(
  counts: { approvals: number; rejections: number },
  requiredApprovals: number
): ApprovalStatus {
  if (counts.rejections > 0) return "rejected";
  if (counts.approvals >= requiredApprovals) return "approved";
  return "pending";
}

/**
 * Sync approval state from reaction counts. Only writes if state changed.
 * Returns the updated approval state, or null if no change was needed.
 */
export async function syncApprovalFromReactions(
  client: MatrixClient,
  roomId: string,
  currentApproval: ApprovalState
): Promise<ApprovalState | null> {
  const room = client.getRoom(roomId);
  if (!room) return null;

  const counts = countApprovalReactions(room);
  if (counts.approvals === 0 && counts.rejections === 0) return null;

  const nextStatus = computeApprovalStatus(counts, currentApproval.requiredApprovals);

  if (
    currentApproval.currentApprovals === counts.approvals &&
    currentApproval.status === nextStatus
  ) {
    return null;
  }

  await setApproval(client, roomId, {
    status: nextStatus,
    requiredApprovals: currentApproval.requiredApprovals,
    currentApprovals: counts.approvals
  });

  return getApproval(room);
}

/**
 * Request approval for a task. Sets status to "pending" with the configured required count.
 */
export async function requestApproval(
  client: MatrixClient,
  roomId: string,
  requiredApprovals: number
): Promise<ApprovalState | null> {
  await setApproval(client, roomId, {
    status: "pending",
    requiredApprovals: Math.max(1, requiredApprovals),
    currentApprovals: 0
  });
  const room = client.getRoom(roomId);
  return room ? getApproval(room) : null;
}

/**
 * Approve a task. Increments the approval count.
 */
export async function approve(
  client: MatrixClient,
  roomId: string,
  current: ApprovalState
): Promise<ApprovalState | null> {
  const newCount = current.currentApprovals + 1;
  const newStatus: ApprovalStatus = newCount >= current.requiredApprovals ? "approved" : "pending";
  await setApproval(client, roomId, {
    status: newStatus,
    requiredApprovals: current.requiredApprovals,
    currentApprovals: newCount
  });
  const room = client.getRoom(roomId);
  return room ? getApproval(room) : null;
}

/**
 * Reject a task.
 */
export async function reject(
  client: MatrixClient,
  roomId: string,
  current: ApprovalState
): Promise<ApprovalState | null> {
  await setApproval(client, roomId, {
    status: "rejected",
    requiredApprovals: current.requiredApprovals,
    currentApprovals: current.currentApprovals
  });
  const room = client.getRoom(roomId);
  return room ? getApproval(room) : null;
}
