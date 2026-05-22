<script lang="ts">
  import { onMount } from "svelte";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import TaskCard from "$lib/components/task/TaskCard.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { ListTodo, LoaderCircle, CircleCheck } from "@lucide/svelte";
  import { goto } from "$app/navigation";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();

  onMount(() => {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client);
    }
  });

  // My tasks = tasks assigned to current user
  let myTasks = $derived(
    tasks.tasks.filter(t => t.assignee === auth.userId || !t.assignee)
  );

  let upcomingTasks = $derived(
    myTasks
      .filter(t => t.dueDate && t.status !== "done" && t.status !== "closed")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  );

  let todoCount = $derived(myTasks.filter(t => t.status === "todo").length);
  let inProgressCount = $derived(myTasks.filter(t => t.status === "in_progress").length);
  let doneCount = $derived(myTasks.filter(t => t.status === "done").length);
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">仪表盘</h1>
    <p class="text-sm text-muted-foreground">欢迎回来，{auth.userId ?? ""}</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4">
    <div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-foreground/10 text-muted-foreground">
        <ListTodo class="h-5 w-5" />
      </div>
      <div>
        <div class="text-2xl font-bold text-foreground">{todoCount}</div>
        <div class="text-sm text-muted-foreground">待办</div>
      </div>
    </div>
    <div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <LoaderCircle class="h-5 w-5" />
      </div>
      <div>
        <div class="text-2xl font-bold text-primary">{inProgressCount}</div>
        <div class="text-sm text-muted-foreground">进行中</div>
      </div>
    </div>
    <div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
        <CircleCheck class="h-5 w-5" />
      </div>
      <div>
        <div class="text-2xl font-bold text-green-500">{doneCount}</div>
        <div class="text-sm text-muted-foreground">已完成</div>
      </div>
    </div>
  </div>

  <!-- My Tasks -->
  <div>
    <h2 class="mb-3 text-lg font-semibold text-foreground">我的任务</h2>
    {#if tasks.isLoading}
      <div class="space-y-2">
        {#each Array(3) as _}
          <Skeleton class="h-20 w-full" />
        {/each}
      </div>
    {:else if myTasks.length === 0}
      <div class="rounded-lg border border-border bg-card p-8 text-center">
        <p class="text-sm text-muted-foreground">暂无分配给你的任务</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each myTasks as task (task.roomId)}
          <TaskCard {task} onClick={(t) => goto(`/project/${encodeURIComponent(t.projectRoomId ?? '')}/task/${encodeURIComponent(t.roomId)}`)} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Upcoming -->
  {#if upcomingTasks.length > 0}
    <div>
      <h2 class="mb-3 text-lg font-semibold text-foreground">即将到期</h2>
      <div class="space-y-2">
        {#each upcomingTasks as task (task.roomId)}
          <TaskCard {task} onClick={(t) => goto(`/project/${encodeURIComponent(t.projectRoomId ?? '')}/task/${encodeURIComponent(t.roomId)}`)} />
        {/each}
      </div>
    </div>
  {/if}
</div>
