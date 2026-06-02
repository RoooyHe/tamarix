<script lang="ts">
  import { onMount } from "svelte";
  import { EventType, RoomEvent, type MatrixEvent, type Room } from "matrix-js-sdk";
  import { page } from "$app/stores";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { getCommentsContext } from "$lib/stores/comments.svelte";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Separator } from "$lib/components/ui/separator";
  import { Field, FieldLabel } from "$lib/components/ui/field";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";
  import TaskStatusSelect from "$lib/components/task/TaskStatusSelect.svelte";
  import PrioritySelect from "$lib/components/task/PrioritySelect.svelte";
  import TaskTypeSelect from "$lib/components/task/TaskTypeSelect.svelte";
  import TaskIdBadge from "$lib/components/common/TaskIdBadge.svelte";
  import TaskHistory from "$lib/components/task/TaskHistory.svelte";
  import TaskRelations from "$lib/components/task/TaskRelations.svelte";
  import AssigneeSelect from "$lib/components/task/AssigneeSelect.svelte";
  import WorklogPanel from "$lib/components/task/WorklogPanel.svelte";
  import MarkdownEditor from "$lib/components/task/MarkdownEditor.svelte";
  import CustomFieldRenderer from "$lib/components/task/CustomFieldRenderer.svelte";
  import ApprovalBadge from "$lib/components/task/ApprovalBadge.svelte";
  import type { TaskStatus, Priority, TaskType, ApprovalStatus } from "$lib/matrix/types";
  import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
  import FileUploadZone from "$lib/components/task/FileUploadZone.svelte";
  import AttachmentList from "$lib/components/task/AttachmentList.svelte";
  import { Send, Archive, ArchiveRestore, MoreVertical, Paperclip, Eye, EyeOff, MessageSquare, Clock, History, GitBranch, Lock, ShieldAlert } from "@lucide/svelte";
  import { getWorklogsContext } from "$lib/stores/worklogs.svelte";
  import { getRecentTasksContext } from "$lib/stores/recent-tasks.svelte";
  import { addWatcher, removeWatcher, getWatchers, sendStateEvent } from "$lib/matrix/state-events";
  import { t } from "$lib/i18n";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { goto } from "$app/navigation";
  import { ChevronLeft, ChevronDown, ChevronRight, Link2, Plus, X, ThumbsUp, ThumbsDown } from "@lucide/svelte";
  import { isValidUrl, sanitizeUrl } from "$lib/utils/url";
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "$lib/components/ui/collapsible";
  import { getAsStatusStore } from "$lib/stores/as-status.svelte";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
  import VersionSelect from "$lib/components/task/VersionSelect.svelte";
  import { getVersionsContext } from "$lib/stores/versions.svelte";
  import {
    setTaskVersion,
    setApproval,
    setCustomFieldValue,
    addExternalLink,
    removeExternalLink,
    getApproval,
    getCustomFieldDefinitions,
    getCustomFieldValues,
    getExternalLinks,
    getTaskVersion,
    getApprovalConfig
  } from "$lib/matrix/state-events";
  import type { VersionInfo, ApprovalState, ApprovalConfig, CustomFieldDefinition, CustomFieldValue, ExternalLink } from "$lib/matrix/types";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();
  let commentsStore = getCommentsContext();
  let worklogsStore = getWorklogsContext();
  let recentTasks = getRecentTasksContext();
  let asStatus = getAsStatusStore();
  let versionsStore = getVersionsContext();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let taskId = $derived(decodeURIComponent($page.params.taskId ?? ""));

  // Find task from store, or load from Matrix
  let task = $derived(tasks.getTaskById(taskId));

  // E2EE degradation status for this task room
  let e2eeDegradedFeatures = $state<Array<{ id: string; description: string }>>([]);
  $effect(() => {
    if (task?.encrypted && task.roomId && asStatus.asAvailable) {
      asStatus.checkE2eeStatus(task.roomId).then(status => {
        e2eeDegradedFeatures = status?.degraded_features ?? [];
      });
    } else {
      e2eeDegradedFeatures = [];
    }
  });

  // Watch state
  let isWatching = $state(false);
  $effect(() => {
    if (auth.client && task?.roomId) {
      const room = auth.client.getRoom(task.roomId);
      if (room) {
        const watchers = getWatchers(room);
        isWatching = watchers.includes(auth.client!.getUserId()!);
      }
    }
  });

  // Track recently viewed tasks
  $effect(() => {
    if (task?.roomId && task.title) {
      recentTasks.addRecentTask(task.roomId, task.title, projectId);
    }
  });

  let commentText = $state("");
  let showUploadZone = $state(false);
  let activeTab = $state("comments");
  let isMobile = new IsMobile();
  let metadataOpen = $state(true);

  // P4: Approval / External Links / Custom Fields / Version state
  let approvalState = $state<ApprovalState | null>(null);
  let externalLinks = $state<ExternalLink[]>([]);
  let customFieldValues = $state<Map<string, CustomFieldValue>>(new Map());
  let customFieldDefs = $state<Map<string, CustomFieldDefinition>>(new Map());
  let currentVersion = $state<string | null>(null);
  let approvalConfig = $state<ApprovalConfig>({ enabled: false, requiredApprovals: 1 });
  let newLinkUrl = $state("");
  let newLinkLabel = $state("");
  let newLinkUrlError = $state("");

  $effect(() => {
    if (auth.client && task?.roomId) {
      const room = auth.client.getRoom(task.roomId);
      if (room) {
        approvalState = getApproval(room);
        externalLinks = getExternalLinks(room);
        customFieldValues = getCustomFieldValues(room);
        currentVersion = getTaskVersion(room);
        // Load custom field definitions from the project (space) room
        const projectRoom = auth.client.getRoom(projectId);
        if (projectRoom) {
          customFieldDefs = getCustomFieldDefinitions(projectRoom);
          approvalConfig = getApprovalConfig(projectRoom);
        }
      }
    }
  });

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
    if (!auth.client || !task || !approvalState) return;
    const room = auth.client.getRoom(task.roomId);
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

    await setApproval(auth.client, task.roomId, {
      status: nextStatus,
      requiredApprovals: approvalState.requiredApprovals,
      currentApprovals: counts.approvals
    });
    approvalState = getApproval(room);
  }

  $effect(() => {
    if (!auth.client || !task?.roomId) return;
    const client = auth.client;
    const roomId = task.roomId;

    const handler = (event: MatrixEvent, room: Room | undefined) => {
      if (!room || room.roomId !== roomId || event.getType() !== "m.reaction") return;
      void syncApprovalFromReactions();
    };

    client.on(RoomEvent.Timeline, handler);
    void syncApprovalFromReactions();
    return () => client.removeListener(RoomEvent.Timeline, handler);
  });

  function goBack() {
    goto(`/project/${encodeURIComponent(projectId)}`);
  }

  onMount(() => {
    if (auth.client && tasks.tasks.length === 0) {
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }

    // Load comments and start listening for new ones when task is available
    return () => {
      commentsStore.stopListening();
    };
  });

  // When task becomes available, load comments and start real-time listener
  $effect(() => {
    if (auth.client && task?.roomId) {
      commentsStore.loadComments(auth.client, task.roomId);
      commentsStore.startListening(auth.client, task.roomId);
    }
  });

  async function handleStatusChange(status: TaskStatus) {
    if (!auth.client || !task) return;
    await tasks.updateTaskStatus(auth.client, task.roomId, status, projectId);
  }

  async function handlePriorityChange(priority: Priority) {
    if (!auth.client || !task) return;
    await tasks.updateTaskPriority(auth.client, task.roomId, priority);
  }

  async function handleTypeChange(type: TaskType) {
    if (!auth.client || !task) return;
    await tasks.updateTaskType(auth.client, task.roomId, type);
  }

  async function handleAssigneeChange(userId: string | undefined) {
    if (!auth.client || !task) return;
    await tasks.updateTaskAssignee(auth.client, task.roomId, userId);
  }

  async function handleSendComment() {
    if (!auth.client || !task || !commentText.trim()) return;
    await auth.client.sendTextMessage(task.roomId, commentText.trim());
    commentText = "";
  }

  async function handleToggleArchive(archived: boolean) {
    if (!auth.client || !task) return;
    await tasks.updateTaskArchive(auth.client, task.roomId, archived);
  }

  async function handleToggleWatch() {
    if (!auth.client || !task) return;
    if (isWatching) {
      await removeWatcher(auth.client, task.roomId, auth.client.getUserId()!);
      isWatching = false;
    } else {
      await addWatcher(auth.client, task.roomId, auth.client.getUserId()!);
      isWatching = true;
    }
  }

  // P4: Version change handler
  async function handleVersionChange(versionKey: string | null) {
    if (!auth.client || !task) return;
    if (versionKey) {
      await setTaskVersion(auth.client, task.roomId, versionKey);
    } else {
      // Clear version by sending empty
      await sendStateEvent(auth.client, task.roomId, TAMARIX_EVENT_TYPES.TASK_VERSION, { version: "" });
    }
    tasks.fetchTasksFromRooms(auth.client, projectId);
  }

  // P4: Approval handlers
  async function handleRequestApproval() {
    if (!auth.client || !task) return;
    await setApproval(auth.client, task.roomId, {
      status: "pending",
      requiredApprovals: Math.max(1, approvalConfig.requiredApprovals),
      currentApprovals: 0
    });
    const room = auth.client.getRoom(task.roomId);
    if (room) approvalState = getApproval(room);
  }

  async function handleApprove() {
    if (!auth.client || !task || !approvalState) return;
    const newCount = approvalState.currentApprovals + 1;
    const newStatus: ApprovalStatus = newCount >= approvalState.requiredApprovals ? "approved" : "pending";
    await setApproval(auth.client, task.roomId, {
      status: newStatus,
      requiredApprovals: approvalState.requiredApprovals,
      currentApprovals: newCount
    });
    const room = auth.client.getRoom(task.roomId);
    if (room) approvalState = getApproval(room);
  }

  async function handleReject() {
    if (!auth.client || !task || !approvalState) return;
    await setApproval(auth.client, task.roomId, {
      status: "rejected",
      requiredApprovals: approvalState.requiredApprovals,
      currentApprovals: approvalState.currentApprovals
    });
    const room = auth.client.getRoom(task.roomId);
    if (room) approvalState = getApproval(room);
  }

  // P4: Custom field change handler
  async function handleCustomFieldChange(fieldName: string, value: string | number) {
    if (!auth.client || !task) return;
    await setCustomFieldValue(auth.client, task.roomId, fieldName, value);
    const room = auth.client.getRoom(task.roomId);
    if (room) customFieldValues = getCustomFieldValues(room);
  }

  // P4: External link handlers
  async function handleAddExternalLink() {
    if (!auth.client || !task || !newLinkUrl.trim() || !newLinkLabel.trim()) return;
    const sanitized = sanitizeUrl(newLinkUrl.trim());
    if (!isValidUrl(sanitized)) {
      newLinkUrlError = t("external_link.invalid_url");
      return;
    }
    newLinkUrlError = "";
    await addExternalLink(auth.client, task.roomId, { url: sanitized, label: newLinkLabel.trim() });
    newLinkUrl = "";
    newLinkLabel = "";
    const room = auth.client.getRoom(task.roomId);
    if (room) externalLinks = getExternalLinks(room);
  }

  async function handleRemoveExternalLink(stateKey: string) {
    if (!auth.client || !task) return;
    await removeExternalLink(auth.client, task.roomId, stateKey);
    const room = auth.client.getRoom(task.roomId);
    if (room) externalLinks = getExternalLinks(room);
  }

  async function handleSaveDescription(body: string, formattedBody: string) {
    if (!auth.client || !task) return;
    await tasks.updateTaskDescription(auth.client, task.roomId, body, formattedBody);
  }

  /** Format a Matrix user ID for display: @user:domain �?user */
  function formatSender(sender: string): string {
    const match = sender.match(/^@([^:]+):/);
    return match ? match[1] : sender;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
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

  /** Collect all attachments from all comments */
  let allAttachments = $derived(
    commentsStore.comments
      .filter(c => c.attachments && c.attachments.length > 0)
      .flatMap(c => c.attachments ?? [])
  );

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

  /** Handle file upload completion */
  async function handleUploadComplete(results: Array<{ mxcUrl: string; fileName: string; mimeType: string; size: number }>) {
    if (!auth.client || !task) return;
    for (const result of results) {
      const file = new File([], result.fileName, { type: result.mimeType });
      await commentsStore.sendFileMessage(auth.client, task.roomId, file, result.mxcUrl);
    }
    showUploadZone = false;
  }

  function handleUploadError(error: string) {
    console.error("Upload error:", error);
  }
</script>

{#if task}
  <div class="space-y-4 pb-20 md:pb-4">
    <!-- Mobile back button -->
    {#if isMobile.current}
      <button type="button" class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]" onclick={goBack}>
        <ChevronLeft class="h-4 w-4" />
        {t("common.back")}
      </button>
    {/if}

    <!-- Header -->
    <div class="flex items-start gap-3 flex-wrap">
      {#if task.ticketId}
        <TaskIdBadge ticketId={task.ticketId} />
      {/if}
      <h1 class="text-xl font-bold text-foreground flex-1">{task.title}</h1>
      {#if task.archived}
        <Badge variant="outline" class="shrink-0 bg-muted/50">
          <Archive class="mr-1 h-3 w-3" />
          {t("common.archived")}
        </Badge>
      {/if}
      {#if task.encrypted}
        <Badge variant="outline" class="shrink-0 bg-green-500/10 text-green-600 border-green-200">
          <Lock class="mr-1 h-3 w-3" />
          {t("encrypt.encrypted")}
        </Badge>
      {/if}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon" class="shrink-0">
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {#if task.archived}
            <DropdownMenuItem onclick={() => handleToggleArchive(false)}>
              <ArchiveRestore class="mr-2 h-4 w-4" />
              {t("common.unarchive")}
            </DropdownMenuItem>
          {:else}
            <DropdownMenuItem onclick={() => handleToggleArchive(true)}>
              <Archive class="mr-2 h-4 w-4" />
              {t("common.archive")}
            </DropdownMenuItem>
          {/if}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- E2EE degradation banner -->
    {#if e2eeDegradedFeatures.length > 0}
      <Alert class="border-amber-500/50 bg-amber-500/5">
        <ShieldAlert class="h-4 w-4 text-amber-600" />
        <AlertTitle class="text-amber-700">{t("as.degraded_title")}</AlertTitle>
        <AlertDescription class="text-amber-600">
          <p class="mb-1">{t("as.degraded_desc")}</p>
          <ul class="list-disc list-inside text-sm">
            {#each e2eeDegradedFeatures as feature}
              <li>{t(`as.degraded.${feature.id}`) || feature.description}</li>
            {/each}
          </ul>
        </AlertDescription>
      </Alert>
    {/if}

    <!-- Description (MarkdownEditor) -->
    <MarkdownEditor
      initialBody={task.description ?? task.formattedDescription ?? ""}
      onsave={handleSaveDescription}
    />

    <!-- Metadata (collapsible on mobile) -->
    <Collapsible bind:open={metadataOpen} class={isMobile.current ? "border rounded-lg p-2" : ""}>
      {#if isMobile.current}
        <CollapsibleTrigger class="flex items-center gap-1 text-sm font-medium text-foreground w-full mb-2 min-h-[44px]">
          {#if metadataOpen}
            <ChevronDown class="h-4 w-4" />
          {:else}
            <ChevronRight class="h-4 w-4" />
          {/if}
          {t("task.metadata")}
        </CollapsibleTrigger>
      {/if}
    <div class="flex flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{t("task.status")}</span>
        <TaskStatusSelect value={task.status} currentStatus={task.status} onValueChange={handleStatusChange} />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{t("task.priority")}</span>
        <PrioritySelect value={task.priority ?? "medium"} onValueChange={handlePriorityChange} />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{t("task.type")}</span>
        <TaskTypeSelect value={task.type ?? "task"} onValueChange={handleTypeChange} />
      </div>
      {#if task.dueDate}
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">{t("task.due_date")}</span>
          <Badge variant="outline">{task.dueDate}</Badge>
        </div>
      {/if}
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{t("task.assignee")}</span>
        {#if auth.client && projectId}
          <AssigneeSelect
            client={auth.client}
            projectRoomId={projectId}
            value={task.assignee}
            onValueChange={handleAssigneeChange}
          />
        {:else if task.assignee}
          <Badge variant="outline">{formatSender(task.assignee)}</Badge>
        {/if}
      </div>
      <!-- Watch toggle -->
      <div class="flex items-center gap-2">
        <Button
          variant={isWatching ? "secondary" : "ghost"}
          size="sm"
          class="h-6 text-xs"
          onclick={handleToggleWatch}
        >
          {#if isWatching}
            <EyeOff class="mr-1 h-3 w-3" />
            {t("task.unwatch")}
          {:else}
            <Eye class="mr-1 h-3 w-3" />
            {t("task.watch")}
          {/if}
        </Button>
      </div>
    </div>
    </Collapsible>

    <!-- Tabs -->
    <Tabs bind:value={activeTab}>
      <!-- Desktop: top TabsList -->
      <TabsList class="w-full overflow-x-auto hidden md:flex">
        <TabsTrigger value="comments">{t("task.comments")} ({commentsStore.comments.length})</TabsTrigger>
        <TabsTrigger value="attachments">{t("task.attachments")} ({allAttachments.length})</TabsTrigger>
        <TabsTrigger value="worklog">{t("worklog.title")}</TabsTrigger>
        <TabsTrigger value="history">{t("task.history")}</TabsTrigger>
        <TabsTrigger value="relations">{t("task.relations")}</TabsTrigger>
        <TabsTrigger value="details">{t("task.details")}</TabsTrigger>
      </TabsList>

      <TabsContent value="details" class="mt-4">
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

          <!-- P4: Fix Version -->
          <Separator />
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">{t("version.link_task")}</span>
            <VersionSelect
              versions={versionsStore.versions}
              value={currentVersion}
              onValueChange={handleVersionChange}
            />
          </div>

          <!-- P4: Approval (AP5: refactored to use ApprovalBadge) -->
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

          <!-- P4: Custom Fields (CF8: refactored to use CustomFieldRenderer) -->
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

          <!-- P4: External Links -->
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

          <!-- P4: Git linked commits -->
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
      </TabsContent>

      <TabsContent value="comments" class="mt-4">
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
          {#if showUploadZone && auth.client}
            <FileUploadZone
              client={auth.client}
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
                  {#if comment.attachments && comment.attachments.length > 0 && auth.client}
                    <div class="mt-2 pl-8">
                      <AttachmentList attachments={comment.attachments} client={auth.client} roomId={task?.roomId ?? ""} />
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
      </TabsContent>

      <TabsContent value="attachments" class="mt-4">
        <div class="space-y-4">
          {#if auth.client}
            <div class="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onclick={() => showUploadZone = !showUploadZone}
              >
                <Paperclip class="mr-1 h-4 w-4" />
                {t("task.upload_attachment")}
              </Button>
            </div>

            {#if showUploadZone}
              <FileUploadZone
                client={auth.client}
                onupload={handleUploadComplete}
                onerror={handleUploadError}
              />
            {/if}
          {/if}

          {#if allAttachments.length > 0 && auth.client}
            <AttachmentList attachments={allAttachments} client={auth.client} roomId={task?.roomId ?? ""} showDelete={true} />
          {:else}
            <div class="text-sm text-muted-foreground text-center py-8">
              {t("task.no_attachments")}
            </div>
          {/if}
        </div>
      </TabsContent>

      <TabsContent value="worklog" class="mt-4">
        {#if auth.client && task}
          <WorklogPanel client={auth.client} roomId={task.roomId} estimateHours={task.estimate?.unit === "hours" ? task.estimate.points : undefined} />
        {/if}
      </TabsContent>

      <TabsContent value="history" class="mt-4">
        {#if auth.client && task}
          <TaskHistory client={auth.client} roomId={task.roomId} />
        {/if}
      </TabsContent>

      <TabsContent value="relations" class="mt-4">
        {#if auth.client && task}
          <TaskRelations client={auth.client} roomId={task.roomId} allTasks={tasks.tasks} />
        {/if}
      </TabsContent>
      <!-- Mobile: bottom fixed tab bar -->
      {#if isMobile.current}
        <div class="fixed bottom-0 left-0 right-0 z-50 border-t bg-background flex justify-around safe-area-pb">
          <button type="button" class="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] {activeTab === 'comments' ? 'text-primary' : 'text-muted-foreground'}" onclick={() => activeTab = 'comments'}>
            <MessageSquare class="h-4 w-4" />
            <span class="text-[10px] mt-0.5">{t("task.comments")}</span>
          </button>
          <button type="button" class="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] {activeTab === 'attachments' ? 'text-primary' : 'text-muted-foreground'}" onclick={() => activeTab = 'attachments'}>
            <Paperclip class="h-4 w-4" />
            <span class="text-[10px] mt-0.5">{t("task.attachments")}</span>
          </button>
          <button type="button" class="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] {activeTab === 'worklog' ? 'text-primary' : 'text-muted-foreground'}" onclick={() => activeTab = 'worklog'}>
            <Clock class="h-4 w-4" />
            <span class="text-[10px] mt-0.5">{t("worklog.title")}</span>
          </button>
          <button type="button" class="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] {activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'}" onclick={() => activeTab = 'history'}>
            <History class="h-4 w-4" />
            <span class="text-[10px] mt-0.5">{t("task.history")}</span>
          </button>
          <button type="button" class="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] {activeTab === 'relations' ? 'text-primary' : 'text-muted-foreground'}" onclick={() => activeTab = 'relations'}>
            <GitBranch class="h-4 w-4" />
            <span class="text-[10px] mt-0.5">{t("task.relations")}</span>
          </button>
        </div>
      {/if}
    </Tabs>
  </div>
{:else}
  <div class="flex h-48 items-center justify-center">
    <div class="text-muted-foreground">{t("task.loading")}</div>
  </div>
{/if}
