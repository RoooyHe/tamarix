<script lang="ts">
  import { onMount } from "svelte";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Button } from "$lib/components/ui/button";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import { Send, Paperclip } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Task } from "$lib/matrix/types";
  import type { MatrixClient } from "matrix-js-sdk";
  import type { CommentsStore } from "$lib/stores/comments.svelte";
  import FileUploadZone from "$lib/components/task/FileUploadZone.svelte";
  import AttachmentList from "$lib/components/task/AttachmentList.svelte";

  interface Props {
    client: MatrixClient;
    task: Task;
    commentsStore: CommentsStore;
  }

  let { client, task, commentsStore }: Props = $props();

  let commentText = $state("");
  let showUploadZone = $state(false);

  // Collect all attachments from all comments
  let allAttachments = $derived(
    commentsStore.comments
      .filter((c) => c.attachments && c.attachments.length > 0)
      .flatMap((c) => c.attachments ?? [])
  );

  // Load comments and start listening when task is available
  $effect(() => {
    if (client && task?.roomId) {
      commentsStore.loadComments(client, task.roomId);
      commentsStore.startListening(client, task.roomId);
    }
  });

  // Cleanup: stop listening on unmount
  onMount(() => {
    return () => {
      commentsStore.stopListening();
    };
  });

  async function handleSendComment() {
    if (!commentText.trim()) return;
    await client.sendTextMessage(task.roomId, commentText.trim());
    commentText = "";
  }

  async function handleUploadComplete(results: Array<{ mxcUrl: string; fileName: string; mimeType: string; size: number }>) {
    for (const result of results) {
      const file = new File([], result.fileName, { type: result.mimeType });
      await commentsStore.sendFileMessage(client, task.roomId, file, result.mxcUrl);
    }
    showUploadZone = false;
  }

  function handleUploadError(error: string) {
    console.error("Upload error:", error);
  }

  function formatSender(sender: string): string {
    const match = sender.match(/^@([^:]+):/);
    return match ? match[1] : sender;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }
</script>

<div class="space-y-4">
  <!-- Comment input -->
  <div class="flex gap-2 flex-col sm:flex-row">
    <Textarea
      bind:value={commentText}
      placeholder={t("task.comment_placeholder")}
      rows={2}
      class="flex-1"
    />
    <div class="flex flex-row sm:flex-col gap-1">
      <Button
        size="icon"
        onclick={handleSendComment}
        disabled={!commentText.trim()}
      >
        <Send class="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onclick={() => showUploadZone = !showUploadZone}
        title={t("task.upload_attachment")}
      >
        <Paperclip class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Upload zone (toggle) -->
  {#if showUploadZone}
    <FileUploadZone
      {client}
      onupload={handleUploadComplete}
      onerror={handleUploadError}
    />
  {/if}

  <!-- Comment list -->
  {#if commentsStore.isLoading}
    <div class="text-sm text-muted-foreground text-center py-4">
      {t("task.loading_comments")}
    </div>
  {:else if commentsStore.comments.length === 0}
    <div class="text-sm text-muted-foreground text-center py-4">
      {t("task.no_comments_hint")}
    </div>
  {:else}
    <div class="space-y-3">
      {#each commentsStore.comments as comment (comment.eventId)}
        <div class="rounded-lg border border-border bg-card p-3">
          <div class="flex items-center gap-2 mb-1">
            <Avatar class="h-6 w-6">
              <AvatarFallback class="text-xs">
                {formatSender(comment.sender).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span class="text-sm font-medium">{formatSender(comment.sender)}</span>
            <span class="text-xs text-muted-foreground">{formatTime(comment.timestamp)}</span>
          </div>
          <p class="text-sm pl-8">{comment.content}</p>
          {#if comment.attachments && comment.attachments.length > 0}
            <div class="mt-2 pl-8">
              <AttachmentList attachments={comment.attachments} {client} roomId={task.roomId} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if commentsStore.error}
    <div class="text-sm text-destructive text-center py-2">
      {commentsStore.error}
    </div>
  {/if}
</div>
