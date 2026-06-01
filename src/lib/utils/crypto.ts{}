/**
 * Cryptographic utility functions for the Tamarix project.
 */

/**
 * Generate a random webhook secret (32 bytes hex string).
 * Uses Web Crypto API for secure random values.
 */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a GitHub webhook HMAC-SHA256 signature.
 *
 * @param payload - Raw request body as string
 * @param signature - The X-Hub-Signature-256 header value (sha256=...)
 * @param secret - The webhook secret
 * @returns Whether the signature is valid
 */
export async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const expected = signature.slice("sha256=".length);

  // Constant-time comparison
  if (computed.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}
