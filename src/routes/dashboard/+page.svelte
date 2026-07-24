<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import { getAuthContext } from '$lib/stores/auth.svelte';
	import { getTasksContext } from '$lib/stores/tasks.svelte';
	import { getProjectsContext } from '$lib/stores/projects.svelte';
	import { getRecentTasksContext } from '$lib/stores/recent-tasks.svelte';
	import TaskCard from '$lib/components/task/TaskCard.svelte';
	import TaskCreateDialog from '$lib/components/task/TaskCreateDialog.svelte';
	import OverdueTaskList from '$lib/components/dashboard/OverdueTaskList.svelte';
	import TeamWorkloadCard from '$lib/components/dashboard/TeamWorkloadCard.svelte';
	import ProjectProgressCard from '$lib/components/dashboard/ProjectProgressCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Progress } from '$lib/components/ui/progress';
	import {
		ListTodo,
		LoaderCircle,
		CircleCheck,
		AlertTriangle,
		Clock,
		Plus,
		History
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import type { Task } from '$lib/matrix/types';

	let auth = getAuthContext();
	let tasks = getTasksContext();
	let projects = getProjectsContext();
	let recentTasks = getRecentTasksContext();

	let showQuickCreate = $state(false);
	let isMobile = new IsMobile();

	onMount(() => {
		if (auth.client) {
			tasks.fetchTasksFromRooms(auth.client);
		}
	});

	let dashboardTasks = $derived.by(() => {
		const myTasks: Task[] = [];
		const now = Date.now();
		let todoCount = 0;
		let inProgressCount = 0;
		let doneCount = 0;
		let overdueCount = 0;

		for (const task of tasks.tasks) {
			if (task.assignee !== auth.userId && task.assignee) continue;

			myTasks.push(task);
			if (task.status === 'todo') todoCount += 1;
			if (task.status === 'in_progress') inProgressCount += 1;
			if (task.status === 'done') doneCount += 1;
			if (
				task.dueDate &&
				task.status !== 'done' &&
				task.status !== 'closed' &&
				new Date(task.dueDate).getTime() < now
			) {
				overdueCount += 1;
			}
		}

		return { myTasks, todoCount, inProgressCount, doneCount, overdueCount };
	});

	// My tasks = tasks assigned to current user or unassigned tasks.
	let myTasks = $derived(dashboardTasks.myTasks);

	let upcomingTasks = $derived(
		myTasks
			.filter((t) => t.dueDate && t.status !== 'done' && t.status !== 'closed')
			.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
			.slice(0, 5)
	);

	let todoCount = $derived(dashboardTasks.todoCount);
	let inProgressCount = $derived(dashboardTasks.inProgressCount);
	let doneCount = $derived(dashboardTasks.doneCount);
	let overdueCount = $derived(dashboardTasks.overdueCount);
	let visibleMyTasks = $derived(myTasks.slice(0, isMobile.current ? 5 : 20));

	// Recently viewed tasks (limit 5)
	let recentEntries = $derived(recentTasks.getRecentTasks(5));

	async function handleQuickCreate(data: {
		name: string;
		topic?: string;
		status: any;
		priority: any;
		type: any;
		assignee?: string;
	}) {
		if (!auth.client) return;
		// Use the first project as default, or let user pick
		const project = projects.projects[0];
		if (!project) return;
		await tasks.createTask(auth.client, project.roomId, {
			name: data.name,
			topic: data.topic,
			status: data.status,
			priority: data.priority,
			type: data.type,
			assignee: data.assignee
		});
	}
</script>

<div class="space-y-6 pb-20 md:pb-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
		<p class="text-sm text-muted-foreground">
			{t('dashboard.welcome', { name: auth.userId ?? '' })}
		</p>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
		<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-foreground/10 text-muted-foreground"
			>
				<ListTodo class="h-5 w-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-foreground">{todoCount}</div>
				<div class="text-sm text-muted-foreground">{t('status.todo')}</div>
			</div>
		</div>
		<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<LoaderCircle class="h-5 w-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-primary">{inProgressCount}</div>
				<div class="text-sm text-muted-foreground">{t('status.in_progress')}</div>
			</div>
		</div>
		<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500"
			>
				<CircleCheck class="h-5 w-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-green-500">{doneCount}</div>
				<div class="text-sm text-muted-foreground">{t('status.done')}</div>
			</div>
		</div>
		<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
			>
				<AlertTriangle class="h-5 w-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-destructive">{overdueCount}</div>
				<div class="text-sm text-muted-foreground">{t('dashboard.overdue')}</div>
			</div>
		</div>
	</div>

	<!-- Quick Create & Recently Viewed -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<h2 class="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
				<Plus class="h-5 w-5 text-primary" />
				{t('dashboard.quick_create')}
			</h2>
			<div class="rounded-lg border border-border bg-card p-4">
				<TaskCreateDialog
					bind:open={showQuickCreate}
					onSubmit={handleQuickCreate}
					client={auth.client ?? undefined}
					projectRoomId={projects.projects[0]?.roomId}
				/>
			</div>
		</div>
		<div>
			<h2 class="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
				<History class="h-5 w-5 text-muted-foreground" />
				{t('dashboard.recently_viewed')}
			</h2>
			{#if recentEntries.length === 0}
				<div class="rounded-lg border border-border bg-card p-4 text-center">
					<p class="text-sm text-muted-foreground">{t('common.no_results')}</p>
				</div>
			{:else}
				<div class="space-y-1.5">
					{#each recentEntries as entry (entry.taskId)}
						<button
							type="button"
							class="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 w-full text-left hover:bg-accent/50 transition-colors"
							onclick={() =>
								goto(
									`/project/${encodeURIComponent(entry.projectRoomId)}/task/${encodeURIComponent(entry.taskId)}`
								)}
						>
							<History class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
							<span class="text-sm truncate flex-1">{entry.taskTitle}</span>
							<span class="text-[10px] text-muted-foreground shrink-0"
								>{new Date(entry.visitedAt).toLocaleDateString()}</span
							>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Overdue Tasks -->
	<OverdueTaskList
		tasks={myTasks}
		onTaskClick={(t) =>
			goto(
				`/project/${encodeURIComponent(t.projectRoomId ?? '')}/task/${encodeURIComponent(t.roomId)}`
			)}
	/>

	<!-- My Tasks -->
	<div>
		<h2 class="mb-3 text-lg font-semibold text-foreground">{t('dashboard.my_tasks')}</h2>
		{#if tasks.isLoading}
			<div class="space-y-2">
				{#each Array(3) as _}
					<Skeleton class="h-20 w-full" />
				{/each}
			</div>
		{:else if myTasks.length === 0}
			<div class="rounded-lg border border-border bg-card p-8 text-center">
				<p class="text-sm text-muted-foreground">{t('dashboard.no_my_tasks')}</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each visibleMyTasks as task (task.roomId)}
					<TaskCard
						{task}
						onClick={(t) =>
							goto(
								`/project/${encodeURIComponent(t.projectRoomId ?? '')}/task/${encodeURIComponent(t.roomId)}`
							)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Upcoming -->
	{#if upcomingTasks.length > 0}
		<div>
			<h2 class="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
				<Clock class="h-5 w-5 text-muted-foreground" />
				{t('dashboard.upcoming')}
			</h2>
			<div class="space-y-2">
				{#each upcomingTasks as task (task.roomId)}
					<TaskCard
						{task}
						onClick={(t) =>
							goto(
								`/project/${encodeURIComponent(t.projectRoomId ?? '')}/task/${encodeURIComponent(t.roomId)}`
							)}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Project Progress -->
	<ProjectProgressCard
		projects={projects.projects}
		tasks={tasks.tasks}
		onProjectClick={(roomId) => goto(`/project/${encodeURIComponent(roomId)}`)}
	/>

	<!-- Team Workload -->
	<TeamWorkloadCard tasks={tasks.tasks} />
</div>
