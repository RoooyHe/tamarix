<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import type { Attachment } from "$lib/matrix/types";
  import AttachmentPreview from "./AttachmentPreview.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from "$lib/components/ui/dialog";
  import { Trash2 } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  interface Props {
    attachments: Attachment[];
    client: MatrixClient;
    /** Room ID for redacting events */
    roomId: string;
    /** Whether to show delete buttons (default: false) */
    showDelete?: boolean;
    /** Callback after an attachment is deleted */
    ondelete?: (eventId: string) => void;
  }

  let { attachments, client, roomId, showDelete = false, ondelete }: Props = $props();

  let deleteTarget = $state<Attachment | null>(null);
  let isDeleting = $state(false);

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return;
    isDeleting = true;
    try {
      await client.redactEvent(roomId, deleteTarget.eventId, undefined, {
        reason: "Deleted by user"
      });
      ondelete?.(deleteTarget.eventId);
      deleteTarget = null;
    } catch (e) {
      console.error("Failed to delete attachment:", e);
    } finally {
      isDeleting = false;
    }
  }
</script>

{#if attachments.length > 0}
  <div class="space-y-2">
    {#each attachments as attachment (attachment.eventId)}
      <div class="group relative">
        <AttachmentPreview {attachment} {client} />
        {#if showDelete}
          <Button
            variant="ghost"
            size="icon"
            class="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onclick={() => deleteTarget = attachment}
            title={t("attachments.delete")}
          >
            <Trash2 class="h-3 w-3 text-destructive" />
          </Button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<!-- Delete confirmation dialog -->
<Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) deleteTarget = null; }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t("attachments.delete_confirm")}</DialogTitle>
      <DialogDescription>
        {t("attachments.delete_desc")}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onclick={() => deleteTarget = null}>
        {t("common.cancel")}
      </Button>
      <Button variant="destructive" onclick={handleConfirmDelete} disabled={isDeleting}>
        {isDeleting ? t("common.loading") : t("common.delete")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
