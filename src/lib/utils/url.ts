/**
 * URL validation utility functions.
 */

/**
 * Validate a URL string.
 * Returns true if the URL has a valid protocol (http/https) and hostname.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitize a URL by ensuring it has a protocol prefix.
 * If the URL starts with "//", prepend "https:".
 * If it looks like a domain (contains "." but no protocol), prepend "https://".
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return "https:" + trimmed;
  if (!trimmed.includes("://") && trimmed.includes(".") && !trimmed.includes(" ")) {
    return "https://" + trimmed;
  }
  return trimmed;
}
