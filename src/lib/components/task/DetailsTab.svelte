<script lang="ts">
  import { RoomEvent, type MatrixEvent, type Room } from "matrix-js-sdk";
  import { Separator } from "$lib/components/ui/separator";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Link2, Plus, X, ThumbsUp, ThumbsDown, GitBranch } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Task, ApprovalState, ApprovalStatus, ApprovalConfig, CustomFieldDefinition, CustomFieldValue, ExternalLink } from "$lib/matrix/types";
  import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
  import type { MatrixClient } from "matrix-js-sdk";
  import type { CommentsStore } from "$lib/stores/comments.svelte";
  import type { VersionsStore } from "$lib/stores/versions.svelte";
  import ApprovalBadge from "$lib/components/task/ApprovalBadge.svelte";
  import CustomFieldRenderer from "$lib/components/task/CustomFieldRenderer.svelte";
  import VersionSelect from "$lib/components/task/VersionSelect.svelte";
  import {
    setApproval,
    setCustomFieldValue,
    addExternalLink,
    removeExternalLink,
    getApproval,
    getCustomFieldDefinitions,
    getCustomFieldValues,
    getExternalLinks,
    getApprovalConfig,
  } from "$lib/matrix/state-events";
  import { setTaskVersion, getTaskVersion } from "$lib/matrix/task-repository";
  import { sendStateEvent } from "$lib/matrix/state-events";
  import { isValidUrl, sanitizeUrl } from "$lib/utils/url";

  interface Props {
    client: MatrixClient;
    task: Task;
    projectId: string;
    versionsStore: VersionsStore;
    commentsStore: CommentsStore;
    onRefresh: () => void;
  }

  let { client, task, projectId, versionsStore, commentsStore, onRefresh }: Props = $props();

  // P4 state
  let approvalState = $state<ApprovalState | null>(null);
  let externalLinks = $state<ExternalLink[]>([]);
  let customFieldValues = $state<Map<string, CustomFieldValue>>(new Map());
  let customFieldDefs = $state<Map<string, CustomFieldDefinition>>(new Map());
  let currentVersion = $state<string | null>(null);
  let approvalConfig = $state<ApprovalConfig>({ enabled: false, requiredApprovals: 1 });
  let newLinkUrl = $state("");
  let newLinkLabel = $state("");
  let newLinkUrlError = $state("");

  // Load P4 data from room
  $effect(() => {
    if (client && task?.roomId) {
      const room = client.getRoom(task.roomId);
      if (room) {
        approvalState = getApproval(room);
        externalLinks = getExternalLinks(room);
        customFieldValues = getCustomFieldValues(room);
        currentVersion = getTaskVersion(room);
        const projectRoom = client.getRoom(projectId);
        if (projectRoom) {
          customFieldDefs = getCustomFieldDefinitions(projectRoom);
          approvalConfig = getApprovalConfig(projectRoom);
        }
      }
    }
  });

  // Approval reaction counting
  function getApprovalReactionCounts(room: Room): { approvals: number; rejections: number } {
    const approvals = new Set<string>();
    const rejections = new Set<string>();
    const events = room.getLiveTimeline().getEvents();

    for (const event of events) {
      if (event.getType() !== "m.reaction") continue;
      const content = event.getContent() as { "m.relates_to"?: { key?: string; event_id?: string } };
      const key = content["m.relates_to"]?.key;
      const sender = event.getSender() ?? event.getId() ?? "";
      if (!key) continue;
      if (key === "+1" || key === "👍" || key === "👍️") approvals.add(sender);
      if (key === "-1" || key === "👎" || key === "👎️") rejections.add(sender);
    }

    return { approvals: approvals.size, rejections: rejections.size };
  }

  async function syncApprovalFromReactions() {
    if (!task || !approvalState) return;
    const room = client.getRoom(task.roomId);
    if (!room) return;

    const counts = getApprovalReactionCounts(room);
    if (counts.approvals === 0 && counts.rejections === 0) return;

    const nextStatus: ApprovalStatus =
      counts.rejections > 0
        ? "rejected"
        : counts.approvals >= approvalState.requiredApprovals
          ? "approved"
          : "pending";

    if (
      approvalState.currentApprovals === counts.approvals &&
      approvalState.status === nextStatus
    ) {
      return;
    }

    await setApproval(client, task.roomId, {
      status: nextStatus,
      requiredApprovals: approvalState.requiredApprovals,
      currentApprovals: counts.approvals
    });
    approvalState = getApproval(room);
  }

  // Listen for reaction events to sync approval
  $effect(() => {
    if (!task?.roomId) return;
    const roomId = task.roomId;

    const handler = (event: MatrixEvent, room: Room | undefined) => {
      if (!room || room.roomId !== roomId || event.getType() !== "m.reaction") return;
      void syncApprovalFromReactions();
    };

    client.on(RoomEvent.Timeline, handler);
    void syncApprovalFromReactions();
    return () => client.removeListener(RoomEvent.Timeline, handler);
  });

  // Version change handler
  async function handleVersionChange(versionKey: string | null) {
    if (versionKey) {
      await setTaskVersion(client, task.roomId, versionKey);
    } else {
      await sendStateEvent(client, task.roomId, TAMARIX_EVENT_TYPES.TASK_VERSION, { version: "" });
    }
    onRefresh();
  }

  // Approval handlers
  async function handleRequestApproval() {
    await setApproval(client, task.roomId, {
      status: "pending",
      requiredApprovals: Math.max(1, approvalConfig.requiredApprovals),
      currentApprovals: 0
    });
    const room = client.getRoom(task.roomId);
    if (room) approvalState = getApproval(room);
  }

  async function handleApprove() {
    if (!approvalState) return;
    const newCount = approvalState.currentApprovals + 1;
    const newStatus: ApprovalStatus = newCount >= approvalState.requiredApprovals ? "approved" : "pending";
    await setApproval(client, task.roomId, {
      status: newStatus,
      requiredApprovals: approvalState.requiredApprovals,
      currentApprovals: newCount
    });
    const room = client.getRoom(task.roomId);
    if (room) approvalState = getApproval(room);
  }

  async function handleReject() {
    if (!approvalState) return;
    await setApproval(client, task.roomId, {
      status: "rejected",
      requiredApprovals: approvalState.requiredApprovals,
      currentApprovals: approvalState.currentApprovals
    });
    const room = client.getRoom(task.roomId);
    if (room) approvalState = getApproval(room);
  }

  // Custom field change handler
  async function handleCustomFieldChange(fieldName: string, value: string | number) {
    await setCustomFieldValue(client, task.roomId, fieldName, value);
    const room = client.getRoom(task.roomId);
    if (room) customFieldValues = getCustomFieldValues(room);
  }

  // External link handlers
  async function handleAddExternalLink() {
    if (!newLinkUrl.trim() || !newLinkLabel.trim()) return;
    const sanitized = sanitizeUrl(newLinkUrl.trim());
    if (!isValidUrl(sanitized)) {
      newLinkUrlError = t("external_link.invalid_url");
      return;
    }
    newLinkUrlError = "";
    await addExternalLink(client, task.roomId, { url: sanitized, label: newLinkLabel.trim() });
    newLinkUrl = "";
    newLinkLabel = "";
    const room = client.getRoom(task.roomId);
    if (room) externalLinks = getExternalLinks(room);
  }

  async function handleRemoveExternalLink(stateKey: string) {
    await removeExternalLink(client, task.roomId, stateKey);
    const room = client.getRoom(task.roomId);
    if (room) externalLinks = getExternalLinks(room);
  }

  function getFaviconUrl(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    } catch {
      return "";
    }
  }

  function parseCommitNotice(content: string): { provider: string; repo: string; branch: string; hash: string; message: string } | null {
    const match = content.match(/^\[(GitHub|GitLab)\]\s+(.+?)@(.+?):\s+([a-f0-9]{7,40})\s+-\s+(.+?)(?:\s+\(|$)/i);
    if (!match) return null;
    return {
      provider: match[1],
      repo: match[2],
      branch: match[3],
      hash: match[4],
      message: match[5]
    };
  }

  let commitLinks = $derived.by(() => {
    const links: Array<{
      eventId: string;
      timestamp: number;
      provider: string;
      repo: string;
      branch: string;
      hash: string;
      message: string;
    }> = [];
    for (const comment of commentsStore.comments) {
      const parsed = parseCommitNotice(comment.content);
      if (parsed) links.push({ eventId: comment.eventId, timestamp: comment.timestamp, ...parsed });
    }
    return links;
  });
</script>

<div class="space-y-3">
  <div class="grid grid-cols-2 gap-4">
    <div>
      <div class="text-xs text-muted-foreground">{t("task.created_at")}</div>
      <div class="text-sm">{new Date(task.createdAt).toLocaleString()}</div>
    </div>
    <div class="hidden md:block">
      <div class="text-xs text-muted-foreground">Room ID</div>
      <div class="font-mono text-xs break-all">{task.roomId}</div>
    </div>
    {#if task.estimate}
      <div>
        <div class="text-xs text-muted-foreground">{t("task.estimate")}</div>
        <div class="text-sm">{task.estimate.points} {task.estimate!.unit === "story_points" ? t("task.estimate.story_points") : task.estimate!.unit === "hours" ? t("task.estimate.hours") : t("task.estimate.days")}</div>
      </div>
    {/if}
  </div>

  <!-- Version -->
  <Separator />
  <div class="flex items-center gap-2">
    <span class="text-xs text-muted-foreground">{t("version.link_task")}</span>
    <VersionSelect
      versions={versionsStore.versions}
      value={currentVersion}
      onValueChange={handleVersionChange}
    />
  </div>

  <!-- Approval -->
  <Separator />
  <div>
    <h3 class="text-sm font-medium mb-2">{t("approval.title")}</h3>
    {#if approvalState}
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <ApprovalBadge
            status={approvalState.status}
            currentApprovals={approvalState.currentApprovals}
            requiredApprovals={approvalState.requiredApprovals}
          />
        </div>
        {#if approvalState.status === "pending"}
          <div class="flex gap-2">
            <Button size="sm" variant="outline" class="h-7 text-xs gap-1" onclick={handleApprove}>
              <ThumbsUp class="h-3 w-3" />
              {t("approval.approve")}
            </Button>
            <Button size="sm" variant="outline" class="h-7 text-xs gap-1" onclick={handleReject}>
              <ThumbsDown class="h-3 w-3" />
              {t("approval.reject")}
            </Button>
          </div>
        {/if}
      </div>
    {:else}
      <Button size="sm" variant="outline" class="h-7 text-xs" onclick={handleRequestApproval}>
        {t("approval.request")}
      </Button>
    {/if}
  </div>

  <!-- Custom Fields -->
  {#if customFieldDefs.size > 0}
    <Separator />
    <div>
      <h3 class="text-sm font-medium mb-2">{t("custom_field.title")}</h3>
      <div class="space-y-2">
        {#each customFieldDefs as [fieldName, def] (fieldName)}
          <CustomFieldRenderer
            definition={def}
            {fieldName}
            value={customFieldValues.get(fieldName)}
            onchange={handleCustomFieldChange}
          />
        {/each}
      </div>
    </div>
  {/if}

  <!-- External Links -->
  <Separator />
  <div>
    <h3 class="text-sm font-medium mb-2">{t("external_link.title")}</h3>
    {#if externalLinks.length > 0}
      <div class="space-y-1.5 mb-3">
        {#each externalLinks as link (link.stateKey ?? link.url)}
          {@const faviconUrl = getFaviconUrl(link.url)}
          <div class="flex items-center gap-2 text-sm">
            {#if faviconUrl}
              <img src={faviconUrl} alt="" class="h-3.5 w-3.5 shrink-0 rounded-sm" />
            {:else}
              <Link2 class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {/if}
            <a href={link.url} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline truncate">
              {link.label}
            </a>
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5 shrink-0"
              title={t("external_link.delete")}
              onclick={() => handleRemoveExternalLink(link.stateKey ?? link.url)}
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-muted-foreground mb-2">{t("external_link.no_links")}</p>
    {/if}
    <div class="flex gap-2">
      <Input
        class="h-7 text-xs"
        placeholder={t("external_link.label")}
        bind:value={newLinkLabel}
      />
      <Input
        class="h-7 text-xs flex-1 {newLinkUrlError ? 'border-red-500' : ''}"
        placeholder={t("external_link.url")}
        bind:value={newLinkUrl}
      />
      {#if newLinkUrlError}
        <span class="text-[10px] text-red-500">{newLinkUrlError}</span>
      {/if}
      <Button
        size="sm"
        variant="outline"
        class="h-7 text-xs gap-1 shrink-0"
        disabled={!newLinkUrl.trim() || !newLinkLabel.trim()}
        onclick={handleAddExternalLink}
      >
        <Plus class="h-3 w-3" />
        {t("external_link.add")}
      </Button>
    </div>
  </div>

  <!-- Git linked commits -->
  <Separator />
  <div>
    <h3 class="text-sm font-medium mb-2">{t("git.commits")}</h3>
    {#if commitLinks.length > 0}
      <div class="space-y-1.5">
        {#each commitLinks as commit (commit.eventId)}
          <div class="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
            <GitBranch class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span class="font-mono text-muted-foreground">{commit.hash}</span>
            <span class="truncate text-foreground">{commit.message}</span>
            <span class="ml-auto shrink-0 text-muted-foreground">{commit.provider} · {commit.branch}</span>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-muted-foreground">{t("git.no_commits")}</p>
    {/if}
  </div>
</div>
