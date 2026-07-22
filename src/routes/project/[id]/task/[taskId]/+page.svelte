<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { getCommentsContext } from "$lib/stores/comments.svelte";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "$lib/components/ui/collapsible";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
  import { Archive, ArchiveRestore, MoreVertical, MessageSquare, Clock, History, GitBranch, Lock, ShieldAlert, ChevronLeft, ChevronDown, ChevronRight, Paperclip, Upload } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { TaskStatus, Priority, TaskType, VersionInfo } from "$lib/matrix/types";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { goto } from "$app/navigation";
  import { getAsStatusStore } from "$lib/stores/as-status.svelte";
  import { getRecentTasksContext } from "$lib/stores/recent-tasks.svelte";
  import { getVersions } from "$lib/matrix/project-versions";

  // Sub-components
  import TaskMetadata from "$lib/components/task/TaskMetadata.svelte";
  import CommentsTab from "$lib/components/task/CommentsTab.svelte";
  import DetailsTab from "$lib/components/task/DetailsTab.svelte";
  import TaskHistory from "$lib/components/task/TaskHistory.svelte";
  import TaskRelations from "$lib/components/task/TaskRelations.svelte";
  import WorklogPanel from "$lib/components/task/WorklogPanel.svelte";
  import MarkdownEditor from "$lib/components/task/MarkdownEditor.svelte";
  import TaskIdBadge from "$lib/components/common/TaskIdBadge.svelte";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import { addWatcher, removeWatcher, getWatchers } from "$lib/matrix/watchers";
  import AttachmentList from "$lib/components/task/AttachmentList.svelte";
  import FileUploadZone from "$lib/components/task/FileUploadZone.svelte";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let commentsStore = getCommentsContext();
  let recentTasks = getRecentTasksContext();
  let asStatus = getAsStatusStore();

  let versions = $state<VersionInfo[]>([]);

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let taskId = $derived(decodeURIComponent($page.params.taskId ?? ""));
  let task = $derived(tasks.getTaskById(taskId));

  // E2EE degradation status
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

  // Load versions for the project
  $effect(() => {
    if (auth.client && projectId) {
      const room = auth.client.getRoom(projectId);
      versions = room ? getVersions(room) : [];
    }
  });

  let activeTab = $state("comments");
  let isMobile = new IsMobile();
  let metadataOpen = $state(true);

  // Upload zone state (shared between comments and attachments tabs)
  let showUploadZone = $state(false);

  onMount(() => {
    if (auth.client && tasks.tasks.length === 0) {
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }
  });

  function goBack() {
    goto(`/project/${encodeURIComponent(projectId)}`);
  }

  // Task change handlers
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

  async function handleSaveDescription(body: string, formattedBody: string) {
    if (!auth.client || !task) return;
    await tasks.updateTaskDescription(auth.client, task.roomId, body, formattedBody);
  }

  function handleRefreshTasks() {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }
  }

  // All attachments derived (for attachments tab)
  let allAttachments = $derived(
    commentsStore.comments
      .filter(c => c.attachments && c.attachments.length > 0)
      .flatMap(c => c.attachments ?? [])
  );

  // Upload handlers (shared)
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

    <!-- Description -->
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
      <TaskMetadata
        {task}
        client={auth.client}
        {projectId}
        {isWatching}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onTypeChange={handleTypeChange}
        onAssigneeChange={handleAssigneeChange}
        onToggleWatch={handleToggleWatch}
      />
    </Collapsible>

    <!-- Tabs -->
    <Tabs bind:value={activeTab}>
      <TabsList class="w-full overflow-x-auto hidden md:flex">
        <TabsTrigger value="comments">{t("task.comments")} ({commentsStore.comments.length})</TabsTrigger>
        <TabsTrigger value="attachments">{t("task.attachments")} ({allAttachments.length})</TabsTrigger>
        <TabsTrigger value="worklog">{t("worklog.title")}</TabsTrigger>
        <TabsTrigger value="history">{t("task.history")}</TabsTrigger>
        <TabsTrigger value="relations">{t("task.relations")}</TabsTrigger>
        <TabsTrigger value="details">{t("task.details")}</TabsTrigger>
      </TabsList>

      <TabsContent value="comments" class="mt-4">
        {#if auth.client}
          <CommentsTab client={auth.client} {task} {commentsStore} />
        {/if}
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
                <Upload class="mr-1 h-4 w-4" />
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
            <AttachmentList attachments={allAttachments} client={auth.client} roomId={task.roomId} showDelete={true} />
          {:else}
            <div class="text-sm text-muted-foreground text-center py-8">
              {t("task.no_attachments")}
            </div>
          {/if}
        </div>
      </TabsContent>

      <TabsContent value="worklog" class="mt-4">
        {#if auth.client}
          <WorklogPanel client={auth.client} roomId={task.roomId} estimateHours={task.estimate?.unit === "hours" ? task.estimate.points : undefined} />
        {/if}
      </TabsContent>

      <TabsContent value="history" class="mt-4">
        {#if auth.client}
          <TaskHistory client={auth.client} roomId={task.roomId} />
        {/if}
      </TabsContent>

      <TabsContent value="relations" class="mt-4">
        {#if auth.client}
          <TaskRelations client={auth.client} roomId={task.roomId} allTasks={tasks.tasks} />
        {/if}
      </TabsContent>

      <TabsContent value="details" class="mt-4">
        {#if auth.client}
          <DetailsTab
            client={auth.client}
            {task}
            {projectId}
            {versions}
            {commentsStore}
            onRefresh={handleRefreshTasks}
          />
        {/if}
      </TabsContent>

      <!-- Mobile bottom tab bar -->
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
