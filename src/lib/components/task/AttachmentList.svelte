<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import type { Attachment } from "$lib/matrix/types";
  import AttachmentPreview from "./AttachmentPreview.svelte";

  interface Props {
    attachments: Attachment[];
    client: MatrixClient;
  }

  let { attachments, client }: Props = $props();
</script>

{#if attachments.length > 0}
  <div class="space-y-2">
    {#each attachments as attachment (attachment.eventId)}
      <AttachmentPreview {attachment} {client} />
    {/each}
  </div>
{/if}
