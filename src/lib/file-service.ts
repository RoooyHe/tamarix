import type { MatrixClient } from "matrix-js-sdk";
import { t } from "$lib/i18n";

/** Allowed MIME types for upload */
const ALLOWED_MIME_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/csv", "text/markdown",
  "application/zip", "application/x-tar", "application/gzip",
  "application/json",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/ogg", "audio/webm"
];

/** Default max file size: 50 MB */
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

export interface UploadOptions {
  /** MIME type whitelist (defaults to ALLOWED_MIME_TYPES) */
  allowedMimeTypes?: string[];
  /** Max file size in bytes (defaults to 50MB) */
  maxSize?: number;
  /** Progress callback */
  onProgress?: (sentBytes: number, totalBytes: number) => void;
}

export interface UploadResult {
  mxcUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Upload a file to the Matrix media server.
 * Validates the file against MIME and size limits before uploading.
 */
export async function upload(
  client: MatrixClient,
  file: File,
  options?: UploadOptions
): Promise<UploadResult> {
  const allowedMimeTypes = options?.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;

  const validation = validate(file, allowedMimeTypes, maxSize);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { content_uri: mxcUrl } = await client.uploadContent(file, {
    type: file.type,
    name: file.name,
    progressHandler: options?.onProgress
      ? (event: { loaded: number; total: number }) => {
          options.onProgress!(event.loaded, event.total);
        }
      : undefined
  });

  return {
    mxcUrl,
    fileName: file.name,
    mimeType: file.type,
    size: file.size
  };
}

/**
 * Get an HTTP download URL for an mxc:// URI.
 * Optionally specify thumbnail dimensions and crop method.
 *
 * @param client - Matrix client
 * @param mxcUrl - The mxc:// URI to resolve
 * @param thumbnail - Optional thumbnail parameters (width, height, method)
 * @returns The HTTP URL, or null if the URI cannot be resolved
 */
export function getUrl(
  client: MatrixClient,
  mxcUrl: string,
  thumbnail?: { width: number; height: number; method?: "crop" | "scale" }
): string | null {
  if (thumbnail) {
    return client.mxcUrlToHttp(mxcUrl, thumbnail.width, thumbnail.height, thumbnail.method ?? "scale") ?? null;
  }
  return client.mxcUrlToHttp(mxcUrl) ?? null;
}

/**
 * Validate a file against a MIME whitelist and size limit.
 */
export function validate(
  file: File,
  allowedMimeTypes: string[] = ALLOWED_MIME_TYPES,
  maxSize: number = DEFAULT_MAX_SIZE
): { valid: boolean; error?: string } {
  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: t("error.unsupported_file_type", { type: file.type }) };
  }
  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
    return { valid: false, error: t("error.file_size_exceeded", { max: maxMB }) };
  }
  return { valid: true };
}

/**
 * Format file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Determine the Matrix msgtype for a file based on its MIME type.
 */
export function getMsgType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "m.image";
  if (mimeType.startsWith("video/")) return "m.video";
  if (mimeType.startsWith("audio/")) return "m.audio";
  return "m.file";
}