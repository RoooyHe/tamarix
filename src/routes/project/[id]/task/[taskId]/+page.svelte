<script lang="ts">
  import { onMount } from "svelte";
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
  import type { TaskStatus, Priority, TaskType } from "$lib/matrix/types";
  import FileUploadZone from "$lib/components/task/FileUploadZone.svelte";
  import AttachmentList from "$lib/components/task/AttachmentList.svelte";
  import { Send, Archive, ArchiveRestore, MoreVertical, Paperclip, Eye, EyeOff, MessageSquare, Clock, History, GitBranch, Lock } from "@lucide/svelte";
  import { getWorklogsContext } from "$lib/stores/worklogs.svelte";
  import { getRecentTasksContext } from "$lib/stores/recent-tasks.svelte";
  import { addWatcher, removeWatcher, getWatchers } from "$lib/matrix/state-events";
  import { setDescription } from "$lib/matrix/state-events";
  import { t } from "$lib/i18n";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { goto } from "$app/navigation";
  import { ChevronLeft, ChevronDown, ChevronRight } from "@lucide/svelte";
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "$lib/components/ui/collapsible";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();
  let commentsStore = getCommentsContext();
  let worklogsStore = getWorklogsContext();
  let recentTasks = getRecentTasksContext();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let taskId = $derived(decodeURIComponent($page.params.taskId ?? ""));

  // Find task from store, or load from Matrix
  let task = $derived(tasks.getTaskById(taskId));

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
    const { setPriority } = await import("$lib/matrix/state-events");
    await setPriority(auth.client, task.roomId, priority);
    tasks.fetchTasksFromRooms(auth.client, projectId);
  }

  async function handleTypeChange(type: TaskType) {
    if (!auth.client || !task) return;
    const { setTaskType } = await import("$lib/matrix/state-events");
    await setTaskType(auth.client, task.roomId, type);
    tasks.fetchTasksFromRooms(auth.client, projectId);
  }

  async function handleAssigneeChange(userId: string | undefined) {
    if (!auth.client || !task) return;
    if (userId) {
      const { setAssignee } = await import("$lib/matrix/state-events");
      await setAssignee(auth.client, task.roomId, userId);
    } else {
      const { clearAssignee } = await import("$lib/matrix/state-events");
      await clearAssignee(auth.client, task.roomId);
    }
    tasks.fetchTasksFromRooms(auth.client, projectId);
  }

  async function handleSendComment() {
    if (!auth.client || !task || !commentText.trim()) return;
    await auth.client.sendTextMessage(task.roomId, commentText.trim());
    commentText = "";
  }

  async function handleToggleArchive(archived: boolean) {
    if (!auth.client || !task) return;
    const { setArchive } = await import("$lib/matrix/state-events");
    await setArchive(auth.client, task.roomId, archived);
    tasks.fetchTasksFromRooms(auth.client, projectId);
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

  async function handleSaveDescription(body: string, formattedBody: string) {
    if (!auth.client || !task) return;
    await setDescription(auth.client, task.roomId, body, formattedBody);
    tasks.fetchTasksFromRooms(auth.client, projectId);
  }

  /** Format a Matrix user ID for display: @user:domain �?user */
  function formatSender(sender: string): string {
    const match = sender.match(/^@([^:]+):/);
    return match ? match[1] : sender;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  /** Collect all attachments from all comments */
  let allAttachments = $derived(
    commentsStore.comments
      .filter(c => c.attachments && c.attachments.length > 0)
      .flatMap(c => c.attachments ?? [])
  );

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

    <!-- Description (MarkdownEditor) -->
    <MarkdownEditor
      initialBody={task.description ?? task.formattedDescription ?? ""}
      onsave={handleSaveDescription}
    />

    <!-- Metadata (collapsible on mobile) -->
    <Collapsible bind:open={metadataOpen} class="{isMobile.current ? 'border rounded-lg p-2' : ''}">
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
