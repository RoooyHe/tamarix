import type { TaskStatus } from "$lib/matrix/task-types";

/**
 * Sort order utility functions for manual column sorting.
 *
 * Uses fractional indexing (based on base-62) so that inserting between
 * two existing items never requires re-numbering neighbours.
 *
 * Strategy:
 *   - Each task gets a `sort_order` string stored in a Matrix state event.
 *   - `generateSortBetween(prev, next)` returns a string that sorts
 *     lexicographically between `prev` and `next`.
 *   - When a card is dragged to a new position we only update the
 *     moved card's sort_order.
 */

const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = BASE62_CHARS.length;

/**
 * Encode a non-negative integer as a base-62 string of fixed length.
 */
function toBase62(n: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s = BASE62_CHARS[n % BASE] + s;
    n = Math.floor(n / BASE);
  }
  return s;
}

/**
 * Decode a base-62 string to a non-negative integer.
 */
function fromBase62(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const idx = BASE62_CHARS.indexOf(s[i]);
    if (idx < 0) return 0;
    n = n * BASE + idx;
  }
  return n;
}

/**
 * Default length for sort keys. 6 chars gives ~56 billion positions.
 */
const KEY_LENGTH = 6;

/**
 * The minimum possible sort key (all zeros).
 */
export const SORT_MIN = toBase62(0, KEY_LENGTH);

/**
 * The maximum possible sort key (all 61s = "zzzzzz" in base-62).
 */
export const SORT_MAX = toBase62(Math.pow(BASE, KEY_LENGTH) - 1, KEY_LENGTH);

/**
 * Generate a sort key that lies between `prev` and `next`.
 *
 * If `prev` is null, use SORT_MIN as the lower bound.
 * If `next` is null, use SORT_MAX as the upper bound.
 *
 * Algorithm (midpoint with integer arithmetic):
 *   1. Decode prev (or 0) and next (or max) to integers.
 *   2. Compute mid = floor((prev + next) / 2).
 *   3. If mid === prev, the space is exhausted -- append a new digit
 *      by using the midpoint between prev*BASE and next*BASE (or just
 *      fall back to using a longer key).
 *   4. Encode mid back to base-62.
 */
export function generateSortBetween(
  prev: string | null,
  next: string | null
): string {
  const a = prev ? fromBase62(prev) : 0;
  const b = next ? fromBase62(next) : Math.pow(BASE, KEY_LENGTH) - 1;

  if (a + 1 >= b) {
    // Space exhausted at current length -- extend by one char
    // Mid-point between prev+0 and prev+BASE/2
    const newPrev = a * BASE;
    const newNext = a * BASE + Math.floor(BASE / 2);
    const mid = Math.floor((newPrev + newNext) / 2);
    return toBase62(mid, KEY_LENGTH + 1);
  }

  const mid = Math.floor((a + b) / 2);
  return toBase62(mid, KEY_LENGTH);
}

/**
 * Sort a list of tasks by their sort_order field.
 * Tasks without sort_order are treated as having SORT_MAX (end of list).
 */
export function sortByOrder<T extends { roomId: string; sortOrder?: string }>(
  items: T[],
  orderMap: Map<string, string>
): T[] {
  return [...items].sort((a, b) => {
    const orderA = orderMap.get(a.roomId) ?? SORT_MAX;
    const orderB = orderMap.get(b.roomId) ?? SORT_MAX;
    return orderA.localeCompare(orderB);
  });
}

/**
 * Compute the new sort_order value for a task moved to a specific index
 * within a column.
 *
 * @param items Current items in the column (already sorted)
 * @param newIndex The target index
 * @param orderMap Map of roomId -> sort_order
 * @returns The new sort_order string
 */
export function computeSortAtPosition(
  items: Array<{ roomId: string }>,
  newIndex: number,
  orderMap: Map<string, string>
): string {
  const prevKey = newIndex > 0 ? (orderMap.get(items[newIndex - 1].roomId) ?? null) : null;
  const nextKey = newIndex < items.length ? (orderMap.get(items[newIndex].roomId) ?? null) : null;
  return generateSortBetween(prevKey, nextKey);
}
