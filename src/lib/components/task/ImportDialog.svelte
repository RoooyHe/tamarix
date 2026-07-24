<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Upload, FileText } from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import { parseCSVRaw, parseJSONRaw, type NormalizedImportRow } from '$lib/utils/import';
	import type { MatrixClient } from 'matrix-js-sdk';
	import type { TaskStatus, Priority, TaskType } from '$lib/matrix/types';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		client?: MatrixClient;
		projectRoomId?: string;
		onImportComplete?: () => void;
		createTask: (data: {
			name: string;
			status?: TaskStatus;
			priority?: Priority;
			type?: TaskType;
			assignee?: string;
			tags?: string[];
		}) => Promise<void>;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		client,
		projectRoomId,
		onImportComplete,
		createTask
	}: Props = $props();

	let step = $state<'upload' | 'preview' | 'importing'>('upload');
	let file = $state<File | null>(null);
	let headers: string[] = $state([]);
	let rawRows: Record<string, string>[] = $state([]);
	let fieldMapping = $state<Record<keyof NormalizedImportRow, string>>({
		name: '',
		status: '',
		priority: '',
		type: '',
		assignee: '',
		tags: ''
	});
	let parsedRows = $derived(rawRows.map(mapRow));
	let importProgress = $state(0);
	let importTotal = $state(0);
	let errorMsg = $state<string | null>(null);

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files?.length) return;
		file = input.files[0];
		errorMsg = null;

		try {
			if (file.name.endsWith('.csv')) {
				const parsed = await parseCSVRaw(file);
				headers = parsed.headers;
				rawRows = parsed.rows;
			} else if (file.name.endsWith('.json')) {
				const parsed = await parseJSONRaw(file);
				headers = parsed.headers;
				rawRows = parsed.rows;
			} else {
				errorMsg = 'Unsupported file format. Use CSV or JSON.';
				return;
			}
			fieldMapping = {
				name: findHeader(['title', 'name', 'task']),
				status: findHeader(['status']),
				priority: findHeader(['priority']),
				type: findHeader(['type']),
				assignee: findHeader(['assignee']),
				tags: findHeader(['tags', 'tag'])
			};
			step = 'preview';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : t('import.error');
		}
	}

	async function handleImport() {
		if (parsedRows.length === 0) return;
		step = 'importing';
		importTotal = parsedRows.length;
		importProgress = 0;

		for (let i = 0; i < parsedRows.length; i++) {
			const row = parsedRows[i];
			try {
				await createTask({
					name: row.name,
					status: (row.status as TaskStatus) || undefined,
					priority: (row.priority as Priority) || undefined,
					type: (row.type as TaskType) || undefined,
					assignee: row.assignee || undefined,
					tags: row.tags
						? row.tags
								.split(/[;,]/)
								.map((s) => s.trim())
								.filter(Boolean)
						: undefined
				});
			} catch {
				// Skip failed rows
			}
			importProgress = i + 1;
		}

		onImportComplete?.();
		resetAndClose();
	}

	function resetAndClose() {
		step = 'upload';
		file = null;
		headers = [];
		rawRows = [];
		importProgress = 0;
		importTotal = 0;
		errorMsg = null;
		open = false;
	}

	function findHeader(candidates: string[]): string {
		return headers.find((header) => candidates.includes(header.toLowerCase())) ?? '';
	}

	function mapRow(row: Record<string, string>): NormalizedImportRow {
		return {
			name: fieldMapping.name ? (row[fieldMapping.name] ?? '') : '',
			status: fieldMapping.status ? (row[fieldMapping.status] ?? 'todo') : 'todo',
			priority: fieldMapping.priority ? (row[fieldMapping.priority] ?? 'medium') : 'medium',
			type: fieldMapping.type ? (row[fieldMapping.type] ?? 'task') : 'task',
			assignee: fieldMapping.assignee ? (row[fieldMapping.assignee] ?? '') : '',
			tags: fieldMapping.tags ? (row[fieldMapping.tags] ?? '') : ''
		};
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-[560px]">
		<DialogHeader>
			<DialogTitle>{t('import.title')}</DialogTitle>
		</DialogHeader>

		{#if step === 'upload'}
			<div class="space-y-4">
				<div class="border-2 border-dashed border-border rounded-lg p-8 text-center">
					<Upload class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
					<p class="text-sm text-muted-foreground mb-2">{t('import.upload')}</p>
					<input type="file" accept=".csv,.json" onchange={handleFileChange} class="text-sm" />
				</div>
				{#if errorMsg}
					<p class="text-sm text-destructive">{errorMsg}</p>
				{/if}
			</div>
		{:else if step === 'preview'}
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					{t('import.preview')}: {parsedRows.length} tasks
				</p>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
					{#each Object.keys(fieldMapping) as Array<keyof NormalizedImportRow> as field (field)}
						<label class="space-y-1 text-xs">
							<span class="text-muted-foreground">{field}</span>
							<select
								class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
								bind:value={fieldMapping[field]}
							>
								<option value="">--</option>
								{#each headers as header (header)}
									<option value={header}>{header}</option>
								{/each}
							</select>
						</label>
					{/each}
				</div>
				<div class="max-h-48 overflow-auto rounded border border-border">
					<table class="w-full text-xs">
						<thead class="bg-muted">
							<tr>
								<th class="px-2 py-1 text-left">{t('task.title')}</th>
								<th class="px-2 py-1 text-left">{t('task.status')}</th>
								<th class="px-2 py-1 text-left">{t('task.priority')}</th>
								<th class="px-2 py-1 text-left">{t('task.type')}</th>
							</tr>
						</thead>
						<tbody>
							{#each parsedRows.slice(0, 10) as row (row.name)}
								<tr class="border-t border-border">
									<td class="px-2 py-1">{row.name || '-'}</td>
									<td class="px-2 py-1">{row.status || '-'}</td>
									<td class="px-2 py-1">{row.priority || '-'}</td>
									<td class="px-2 py-1">{row.type || '-'}</td>
								</tr>
							{/each}
							{#if parsedRows.length > 10}
								<tr class="border-t border-border">
									<td colspan="4" class="px-2 py-1 text-muted-foreground"
										>...and {parsedRows.length - 10} more</td
									>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
			<DialogFooter>
				<Button
					variant="outline"
					onclick={() => {
						step = 'upload';
						file = null;
					}}>{t('common.cancel')}</Button
				>
				<Button onclick={handleImport} disabled={parsedRows.length === 0}>
					<FileText class="mr-1 h-4 w-4" />
					{t('import.title')} ({parsedRows.length})
				</Button>
			</DialogFooter>
		{:else if step === 'importing'}
			<div class="space-y-3">
				<p class="text-sm text-muted-foreground">{t('import.progress')}</p>
				<Progress value={(importProgress / Math.max(1, importTotal)) * 100} />
				<p class="text-xs text-muted-foreground">{importProgress} / {importTotal}</p>
			</div>
		{/if}
	</DialogContent>
</Dialog>
