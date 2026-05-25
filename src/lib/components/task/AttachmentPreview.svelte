<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import type { Attachment } from "$lib/matrix/types";
  import { getDownloadUrl, getThumbnailUrl, formatFileSize } from "$lib/matrix/media";
  import { Button } from "$lib/components/ui/button";
  import { Download, FileIcon, Image, Film, Music } from "@lucide/svelte";

  interface Props {
    attachment: Attachment;
    client: MatrixClient;
  }

  let { attachment, client }: Props = $props();

  let isImagePreviewOpen = $state(false);

  let isImage = $derived(attachment.mimeType.startsWith("image/"));
  let isVideo = $derived(attachment.mimeType.startsWith("video/"));
  let isAudio = $derived(attachment.mimeType.startsWith("audio/"));

  let downloadUrl = $derived(getDownloadUrl(client, attachment.mxcUrl));
  let thumbnailUrl = $derived(
    isImage && attachment.thumbnailMxcUrl
      ? getThumbnailUrl(client, attachment.thumbnailMxcUrl, 200, 150)
      : isImage
        ? getThumbnailUrl(client, attachment.mxcUrl, 200, 150)
        : null
  );

  let IconComponent = $derived(
    isImage ? Image : isVideo ? Film : isAudio ? Music : FileIcon
  );
</script>

<div class="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-accent/50">
  <!-- Thumbnail / Icon -->
  {#if isImage && thumbnailUrl}
    <button
      class="shrink-0 rounded overflow-hidden cursor-pointer"
      onclick={() => isImagePreviewOpen = true}
    >
      <img
        src={thumbnailUrl}
        alt={attachment.fileName}
        class="h-12 w-16 object-cover"
        loading="lazy"
      />
    </button>
  {:else if isVideo && thumbnailUrl}
    <div class="shrink-0 relative rounded overflow-hidden">
      <img
        src={thumbnailUrl}
        alt={attachment.fileName}
        class="h-12 w-16 object-cover"
        loading="lazy"
      />
      <div class="absolute inset-0 flex items-center justify-center bg-black/30">
        <Film class="h-4 w-4 text-white" />
      </div>
    </div>
  {:else}
    <div class="shrink-0 flex h-12 w-12 items-center justify-center rounded bg-muted">
      <IconComponent class="h-5 w-5 text-muted-foreground" />
    </div>
  {/if}

  <!-- File info -->
  <div class="flex-1 min-w-0">
    <div class="text-sm font-medium truncate">{attachment.fileName}</div>
    <div class="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</div>
  </div>

  <!-- Download button -->
  {#if downloadUrl}
    <a href={downloadUrl} target="_blank" rel="noopener" download={attachment.fileName}>
      <Button variant="ghost" size="icon" class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Download class="h-4 w-4" />
      </Button>
    </a>
  {/if}
</div>

<!-- Image preview dialog -->
{#if isImagePreviewOpen && isImage && downloadUrl}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    onclick={() => isImagePreviewOpen = false}
    onkeydown={(e) => e.key === "Escape" && (isImagePreviewOpen = false)}
  >
    <img
      src={downloadUrl}
      alt={attachment.fileName}
      class="max-h-[90vh] max-w-[90vw] object-contain"
    />
  </div>
{/if}
