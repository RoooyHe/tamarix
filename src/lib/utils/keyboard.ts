/**
 * Keyboard utility functions for the Tamarix global shortcut system.
 */

/**
 * Check if the current focus is on an input-like element.
 * When focused on such elements, single-letter shortcuts should be suppressed
 * to avoid interfering with typing.
 */
export function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tag = element.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  // contenteditable elements (rich text editors, etc.)
  if (element.isContentEditable) return true;
  return false;
}
