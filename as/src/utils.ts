/**
 * Tamarix AS -- Shared utilities
 */

/**
 * HTML-escape a string for safe inclusion in formatted_body.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
