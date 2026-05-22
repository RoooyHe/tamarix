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
  import { PRIORITY_LABELS, TASK_TYPE_LABELS } from "$lib/matrix/types";
  import type { TaskStatus, Priority, TaskType } from "$lib/matrix/types";
  import { Send, Archive, ArchiveRestore, MoreVertical } from "@lucide/svelte";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();
  let commentsStore = getCommentsContext();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let taskId = $derived(decodeURIComponent($page.params.taskId ?? ""));

  // Find task from store, or load from Matrix
  let task = $derived(tasks.getTaskById(taskId));

  let commentText = $state("");

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

  /** Format a Matrix user ID for display: @user:domain → user */
  function formatSender(sender: string): string {
    const match = sender.match(/^@([^:]+):/);
    return match ? match[1] : sender;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }
</script>

{#if task}
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-start gap-3">
      {#if task.ticketId}
        <TaskIdBadge ticketId={task.ticketId} />
      {/if}
      <h1 class="text-xl font-bold text-foreground flex-1">{task.title}</h1>
      {#if task.archived}
        <Badge variant="outline" class="shrink-0 bg-muted/50">
          <Archive class="mr-1 h-3 w-3" />
          已归档
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
              取消归档
            </DropdownMenuItem>
          {:else}
            <DropdownMenuItem onclick={() => handleToggleArchive(true)}>
              <Archive class="mr-2 h-4 w-4" />
              归档
            </DropdownMenuItem>
          {/if}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    {#if task.description}
      <p class="text-sm text-muted-foreground">{task.description}</p>
    {/if}

    <!-- Metadata -->
    <div class="flex flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">状态</span>
        <TaskStatusSelect value={task.status} onValueChange={handleStatusChange} />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">优先级</span>
        <PrioritySelect value={task.priority ?? "medium"} onValueChange={handlePriorityChange} />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">类型</span>
        <TaskTypeSelect value={task.type ?? "task"} onValueChange={handleTypeChange} />
      </div>
      {#if task.dueDate}
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">截止日期</span>
          <Badge variant="outline">{task.dueDate}</Badge>
        </div>
      {/if}
      {#if task.assignee}
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">负责人</span>
          <Badge variant="outline">{formatSender(task.assignee)}</Badge>
        </div>
      {/if}
    </div>

    <!-- Tabs -->
    <Tabs value="comments">
      <TabsList>
        <TabsTrigger value="details">详情</TabsTrigger>
        <TabsTrigger value="comments">评论 ({commentsStore.comments.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="details" class="mt-4">
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-muted-foreground">创建时间</div>
              <div class="text-sm">{new Date(task.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Room ID</div>
              <div class="font-mono text-xs break-all">{task.roomId}</div>
            </div>
            {#if task.estimate}
              <div>
                <div class="text-xs text-muted-foreground">估算</div>
                <div class="text-sm">{task.estimate.points} {task.estimate!.unit === "story_points" ? "故事点" : task.estimate!.unit === "hours" ? "小时" : "天"}</div>
              </div>
            {/if}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="comments" class="mt-4">
        <div class="space-y-4">
          <!-- Comment input -->
          <div class="flex gap-2">
            <Textarea
              bind:value={commentText}
              placeholder="输入评论..."
              rows={2}
              class="flex-1"
            />
            <Button
              size="icon"
              onclick={handleSendComment}
              disabled={!commentText.trim()}
            >
              <Send class="h-4 w-4" />
            </Button>
          </div>

          <!-- Comment list -->
          {#if commentsStore.isLoading}
            <div class="text-sm text-muted-foreground text-center py-4">
              加载评论中...
            </div>
          {:else if commentsStore.comments.length === 0}
            <div class="text-sm text-muted-foreground text-center py-4">
              暂无评论，发送第一条评论吧
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
    </Tabs>
  </div>
{:else}
  <div class="flex h-48 items-center justify-center">
    <div class="text-muted-foreground">加载任务中...</div>
  </div>
{/if}
