<script lang="ts">
	import { page } from '$app/stores';
	import { getAuthContext } from '$lib/stores/auth.svelte';
	import { getProjectsContext } from '$lib/stores/projects.svelte';
	import { getTasksContext } from '$lib/stores/tasks.svelte';
	import { getVersions } from '$lib/matrix/project-versions';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import {
		ArrowLeft,
		BarChart3,
		TrendingUp,
		Users,
		GitBranch,
		Download,
		Image,
		FileText
	} from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import type { VersionInfo } from '$lib/matrix/types';
	import {
		getBurndownData,
		getStatusDistribution,
		getTrendData,
		getAssigneeWorkload,
		getVersionProgress
	} from '$lib/reports';
	import {
		exportChartToPNG,
		exportBurndownToCSV,
		exportStatusDistributionToCSV,
		exportTrendToCSV,
		exportAssigneeWorkloadToCSV,
		exportVersionProgressToCSV,
		downloadFile
	} from '$lib/utils/export';
	import BurndownChart from '$lib/components/dashboard/BurndownChart.svelte';
	import StatusDistributionChart from '$lib/components/dashboard/StatusDistributionChart.svelte';
	import TrendChart from '$lib/components/dashboard/TrendChart.svelte';
	import AssigneeWorkloadChart from '$lib/components/dashboard/AssigneeWorkloadChart.svelte';
	import VersionProgressChart from '$lib/components/dashboard/VersionProgressChart.svelte';

	let auth = getAuthContext();
	let projects = getProjectsContext();
	let tasksStore = getTasksContext();

	let projectId = $derived(decodeURIComponent($page.params.id ?? ''));
	let project = $derived(projects.getProjectById(projectId));
	let activeTasks = $derived(tasksStore.tasks.filter((t) => !t.archived));

	// Versions
	let versions = $state<VersionInfo[]>([]);
	$effect(() => {
		if (auth.client && projectId) {
			const room = auth.client.getRoom(projectId);
			versions = room ? getVersions(room) : [];
		}
	});

	// Time range
	type TimeRange = 7 | 30 | 90 | 0; // 0 = all
	let timeRange = $state<TimeRange>(30);

	// Chart data
	let burndownData = $derived(getBurndownData(activeTasks, timeRange || 365));
	let statusDistData = $derived(getStatusDistribution(activeTasks));
	let trendData = $derived(getTrendData(activeTasks, timeRange || 365));
	let assigneeData = $derived(getAssigneeWorkload(activeTasks));
	let versionData = $derived(getVersionProgress(activeTasks, versions));

	// Refs for PNG export
	let burndownRef: HTMLElement | null = $state(null);
	let statusDistRef: HTMLElement | null = $state(null);
	let trendRef: HTMLElement | null = $state(null);
	let assigneeRef: HTMLElement | null = $state(null);
	let versionRef: HTMLElement | null = $state(null);

	// Load data
	$effect(() => {
		if (auth.client && projectId) {
			tasksStore.fetchTasksFromRooms(auth.client, projectId);
		}
	});

	// Export handlers
	function handleExportAllPNG() {
		const projectName = project?.name ?? 'project';
		if (burndownRef) exportChartToPNG(burndownRef, `${projectName}-burndown.png`);
		if (statusDistRef) exportChartToPNG(statusDistRef, `${projectName}-status-distribution.png`);
		if (trendRef) exportChartToPNG(trendRef, `${projectName}-trend.png`);
		if (assigneeRef) exportChartToPNG(assigneeRef, `${projectName}-assignee-workload.png`);
		if (versionRef) exportChartToPNG(versionRef, `${projectName}-version-progress.png`);
	}

	function handleExportBurndownPNG() {
		if (burndownRef) exportChartToPNG(burndownRef, `${project?.name ?? 'project'}-burndown.png`);
	}

	function handleExportStatusDistPNG() {
		if (statusDistRef)
			exportChartToPNG(statusDistRef, `${project?.name ?? 'project'}-status-distribution.png`);
	}

	function handleExportTrendPNG() {
		if (trendRef) exportChartToPNG(trendRef, `${project?.name ?? 'project'}-trend.png`);
	}

	function handleExportAssigneePNG() {
		if (assigneeRef)
			exportChartToPNG(assigneeRef, `${project?.name ?? 'project'}-assignee-workload.png`);
	}

	function handleExportVersionPNG() {
		if (versionRef)
			exportChartToPNG(versionRef, `${project?.name ?? 'project'}-version-progress.png`);
	}

	function handleExportCSV() {
		const projectName = project?.name ?? 'project';
		const sections: string[] = [];

		// Burndown
		if (burndownData.length > 0) {
			sections.push('--- Burndown ---');
			sections.push(exportBurndownToCSV(burndownData));
		}

		// Status Distribution
		if (statusDistData.length > 0) {
			sections.push('--- Status Distribution ---');
			sections.push(exportStatusDistributionToCSV(statusDistData));
		}

		// Trend
		if (trendData.length > 0) {
			sections.push('--- Trend ---');
			sections.push(exportTrendToCSV(trendData));
		}

		// Assignee Workload
		if (assigneeData.length > 0) {
			sections.push('--- Assignee Workload ---');
			sections.push(exportAssigneeWorkloadToCSV(assigneeData));
		}

		// Version Progress
		if (versionData.length > 0) {
			sections.push('--- Version Progress ---');
			sections.push(exportVersionProgressToCSV(versionData));
		}

		if (sections.length > 0) {
			downloadFile(sections.join('\n\n'), `${projectName}-report.csv`, 'text/csv');
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3 flex-wrap">
		<Button variant="ghost" size="icon" onclick={() => history.back()}>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<h1 class="text-xl font-bold text-foreground">{t('reports.title')}</h1>
		{#if project}
			<Badge variant="outline">{project.name}</Badge>
		{/if}
		<div class="ml-auto flex items-center gap-2">
			<Select
				type="single"
				value={String(timeRange)}
				onValueChange={(v) => {
					timeRange = Number(v) as TimeRange;
				}}
			>
				<SelectTrigger class="w-36">
					<span>{timeRange === 0 ? t('reports.range_all') : t(`reports.range_${timeRange}d`)}</span>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="7">{t('reports.range_7d')}</SelectItem>
					<SelectItem value="30">{t('reports.range_30d')}</SelectItem>
					<SelectItem value="90">{t('reports.range_90d')}</SelectItem>
					<SelectItem value="0">{t('reports.range_all')}</SelectItem>
				</SelectContent>
			</Select>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button variant="outline" size="sm">
						<Download class="mr-1 h-4 w-4" />
						{t('reports.export')}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onclick={handleExportAllPNG}>
						<Image class="mr-2 h-4 w-4" />
						{t('reports.export_all_png')}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onclick={handleExportBurndownPNG}>
						<Image class="mr-2 h-4 w-4" />
						{t('reports.burndown')}
					</DropdownMenuItem>
					<DropdownMenuItem onclick={handleExportStatusDistPNG}>
						<Image class="mr-2 h-4 w-4" />
						{t('reports.status_distribution')}
					</DropdownMenuItem>
					<DropdownMenuItem onclick={handleExportTrendPNG}>
						<Image class="mr-2 h-4 w-4" />
						{t('reports.trend')}
					</DropdownMenuItem>
					<DropdownMenuItem onclick={handleExportAssigneePNG}>
						<Image class="mr-2 h-4 w-4" />
						{t('reports.assignee_workload')}
					</DropdownMenuItem>
					<DropdownMenuItem onclick={handleExportVersionPNG}>
						<Image class="mr-2 h-4 w-4" />
						{t('reports.version_progress')}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onclick={handleExportCSV}>
						<FileText class="mr-2 h-4 w-4" />
						{t('reports.export_csv')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	</div>

	{#if activeTasks.length === 0}
		<div class="text-center py-12 text-muted-foreground">
			<BarChart3 class="h-8 w-8 mx-auto mb-2 opacity-50" />
			<p>{t('common.no_results')}</p>
		</div>
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Burndown Chart -->
			<div bind:this={burndownRef} class="rounded-lg border border-border bg-card p-5 space-y-4">
				<div class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5 text-muted-foreground" />
					<h2 class="font-semibold text-foreground">{t('reports.burndown')}</h2>
				</div>
				<BurndownChart data={burndownData} />
			</div>

			<!-- Status Distribution -->
			<div bind:this={statusDistRef} class="rounded-lg border border-border bg-card p-5 space-y-4">
				<div class="flex items-center gap-2">
					<BarChart3 class="h-5 w-5 text-muted-foreground" />
					<h2 class="font-semibold text-foreground">{t('reports.status_distribution')}</h2>
				</div>
				<StatusDistributionChart data={statusDistData} />
			</div>

			<!-- Trend Chart -->
			<div
				bind:this={trendRef}
				class="rounded-lg border border-border bg-card p-5 space-y-4 lg:col-span-2"
			>
				<div class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5 text-muted-foreground" />
					<h2 class="font-semibold text-foreground">{t('reports.trend')}</h2>
				</div>
				<TrendChart data={trendData} />
			</div>

			<!-- Assignee Workload -->
			<div bind:this={assigneeRef} class="rounded-lg border border-border bg-card p-5 space-y-4">
				<div class="flex items-center gap-2">
					<Users class="h-5 w-5 text-muted-foreground" />
					<h2 class="font-semibold text-foreground">{t('reports.assignee_workload')}</h2>
				</div>
				<AssigneeWorkloadChart data={assigneeData} />
			</div>

			<!-- Version Progress -->
			<div bind:this={versionRef} class="rounded-lg border border-border bg-card p-5 space-y-4">
				<div class="flex items-center gap-2">
					<GitBranch class="h-5 w-5 text-muted-foreground" />
					<h2 class="font-semibold text-foreground">{t('reports.version_progress')}</h2>
				</div>
				<VersionProgressChart data={versionData} />
			</div>
		</div>
	{/if}
</div>
