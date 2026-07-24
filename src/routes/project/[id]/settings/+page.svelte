<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getAuthContext } from '$lib/stores/auth.svelte';
	import { getProjectsContext } from '$lib/stores/projects.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import MemberManager from '$lib/components/project/MemberManager.svelte';
	import { ArrowLeft, Save, Archive, Plus, Trash2, RefreshCw } from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import type {
		TaskTemplate,
		CustomFieldType,
		CustomFieldDefinition,
		TaskStatus,
		Priority,
		TaskType,
		GitProvider
	} from '$lib/matrix/types';
	import { createTaskTemplate, getTaskTemplates, deleteTaskTemplate } from '$lib/matrix/templates';
	import {
		setCustomFieldDefinition,
		getCustomFieldDefinitions,
		deleteCustomFieldDefinition
	} from '$lib/matrix/custom-fields';
	import { setApprovalConfig, getApprovalConfig } from '$lib/matrix/approvals';
	import { setGitConfig, getGitConfig } from '$lib/matrix/git-config';
	import { generateWebhookSecret } from '$lib/utils/crypto';

	let auth = getAuthContext();
	let projects = getProjectsContext();

	let projectId = $derived(decodeURIComponent($page.params.id ?? ''));
	let project = $derived(projects.getProjectById(projectId));

	let name = $state('');
	let description = $state('');
	let isSaving = $state(false);

	// Template state
	let templates = $state<TaskTemplate[]>([]);
	let newTemplateName = $state('');
	let newTemplateTitle = $state('');
	let newTemplateDesc = $state('');
	let newTemplateStatus: TaskStatus = $state('todo');
	let newTemplatePriority: Priority = $state('medium');
	let newTemplateType: TaskType = $state('task');
	let newTemplateTags = $state('');

	// Custom field state
	let customFields = $state<Map<string, CustomFieldDefinition>>(new Map());
	let newFieldLabel = $state('');
	let newFieldType: CustomFieldType = $state('text');
	let newFieldOptions = $state('');
	let newFieldRequired = $state(false);

	// Approval state
	let approvalEnabled = $state(false);
	let approvalRequired = $state(1);

	// Git integration state
	let gitProvider: GitProvider = $state('github');
	let gitRepoUrl = $state('');
	let gitWebhookSecret = $state('');
	let webhookUrl = $derived(`/api/git/webhook?project=${encodeURIComponent(projectId)}`);

	// Initialize form values when project loads
	$effect(() => {
		if (project) {
			name = project.name;
			description = project.description ?? '';
		}
	});

	// Load templates and custom fields
	$effect(() => {
		if (auth.client && projectId) {
			const room = auth.client.getRoom(projectId);
			if (room) {
				templates = getTaskTemplates(room);
				customFields = getCustomFieldDefinitions(room);
				const approvalConfig = getApprovalConfig(room);
				approvalEnabled = approvalConfig.enabled;
				approvalRequired = approvalConfig.requiredApprovals;
				const gitConfig = getGitConfig(room);
				if (gitConfig) {
					gitProvider = gitConfig.provider;
					gitRepoUrl = gitConfig.repoUrl;
					gitWebhookSecret = gitConfig.webhookSecret;
				}
			}
		}
	});

	async function handleSave() {
		if (!auth.client || !project || isSaving) return;
		isSaving = true;
		try {
			await projects.updateProject(auth.client, projectId, {
				name: name.trim(),
				topic: description.trim()
			});
		} finally {
			isSaving = false;
		}
	}

	async function handleArchive() {
		if (!auth.client || !project) return;
		await projects.archiveProject(auth.client, projectId);
		goto('/dashboard');
	}

	async function handleCreateTemplate() {
		if (!auth.client || !newTemplateName.trim()) return;
		await createTaskTemplate(auth.client, projectId, {
			name: newTemplateName.trim(),
			defaultTitle: newTemplateTitle.trim() || undefined,
			defaultDescription: newTemplateDesc.trim() || undefined,
			defaultStatus: newTemplateStatus,
			defaultPriority: newTemplatePriority,
			defaultType: newTemplateType,
			defaultTags: newTemplateTags.trim()
				? newTemplateTags
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean)
				: undefined
		});
		newTemplateName = '';
		newTemplateTitle = '';
		newTemplateDesc = '';
		newTemplateStatus = 'todo';
		newTemplatePriority = 'medium';
		newTemplateType = 'task';
		newTemplateTags = '';
		reloadConfig();
	}

	async function handleDeleteTemplate(stateKey: string) {
		if (!auth.client) return;
		await deleteTaskTemplate(auth.client, projectId, stateKey);
		reloadConfig();
	}

	async function handleCreateField() {
		if (!auth.client || !newFieldLabel.trim()) return;
		const fieldName = newFieldLabel.trim().replace(/\s+/g, '_').toLowerCase();
		await setCustomFieldDefinition(auth.client, projectId, fieldName, {
			label: newFieldLabel.trim(),
			type: newFieldType,
			options:
				newFieldType === 'select' && newFieldOptions.trim()
					? newFieldOptions
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean)
					: undefined,
			required: newFieldRequired
		});
		newFieldLabel = '';
		newFieldType = 'text';
		newFieldOptions = '';
		newFieldRequired = false;
		reloadConfig();
	}

	async function handleDeleteField(fieldName: string) {
		if (!auth.client) return;
		await deleteCustomFieldDefinition(auth.client, projectId, fieldName);
		reloadConfig();
	}

	async function handleSaveApprovalConfig() {
		if (!auth.client) return;
		await setApprovalConfig(auth.client, projectId, {
			enabled: approvalEnabled,
			requiredApprovals: Math.max(1, approvalRequired)
		});
		reloadConfig();
	}

	function handleGenerateSecret() {
		gitWebhookSecret = generateWebhookSecret();
	}

	async function handleSaveGitConfig() {
		if (!auth.client || !gitRepoUrl.trim() || !gitWebhookSecret.trim()) return;
		await setGitConfig(auth.client, projectId, {
			provider: gitProvider,
			repoUrl: gitRepoUrl.trim(),
			webhookSecret: gitWebhookSecret.trim()
		});
		reloadConfig();
	}

	function reloadConfig() {
		if (!auth.client) return;
		const room = auth.client.getRoom(projectId);
		if (room) {
			templates = getTaskTemplates(room);
			customFields = getCustomFieldDefinitions(room);
			const approvalConfig = getApprovalConfig(room);
			approvalEnabled = approvalConfig.enabled;
			approvalRequired = approvalConfig.requiredApprovals;
			const gitConfig = getGitConfig(room);
			if (gitConfig) {
				gitProvider = gitConfig.provider;
				gitRepoUrl = gitConfig.repoUrl;
				gitWebhookSecret = gitConfig.webhookSecret;
			}
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<Button
			variant="ghost"
			size="icon"
			onclick={() => goto(`/project/${encodeURIComponent(projectId)}`)}
		>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<h1 class="text-xl font-bold text-foreground">{t('project.settings')}</h1>
		{#if project}
			<Badge variant="outline">{project.name}</Badge>
		{/if}
	</div>

	{#if project}
		<!-- Basic Settings -->
		<div class="rounded-lg border border-border bg-card p-6 space-y-4">
			<h2 class="text-lg font-semibold">{t('project.settings')}</h2>

			<div class="space-y-2">
				<label for="project-name" class="text-sm font-medium text-foreground"
					>{t('project.settings.name')}</label
				>
				<Input id="project-name" bind:value={name} placeholder={t('project.name_placeholder')} />
			</div>

			<div class="space-y-2">
				<label for="project-desc" class="text-sm font-medium text-foreground"
					>{t('project.settings.description')}</label
				>
				<Textarea
					id="project-desc"
					bind:value={description}
					rows={3}
					placeholder={t('project.no_description')}
				/>
			</div>

			<div class="flex justify-end">
				<Button onclick={handleSave} disabled={isSaving || !name.trim()}>
					<Save class="mr-1 h-4 w-4" />
					{isSaving ? t('common.saving') : t('project.settings.save')}
				</Button>
			</div>
		</div>

		<Separator />

		<!-- Members -->
		<div class="rounded-lg border border-border bg-card p-6 space-y-4">
			<h2 class="text-lg font-semibold">{t('project.members')}</h2>
			{#if auth.client}
				<MemberManager client={auth.client} spaceRoomId={projectId} />
			{:else}
				<p class="text-sm text-muted-foreground">{t('settings.not_logged_in')}</p>
			{/if}
		</div>

		<Separator />

		<!-- Task Templates -->
		<div class="rounded-lg border border-border bg-card p-6 space-y-4">
			<h2 class="text-lg font-semibold">{t('template.title')}</h2>

			{#if templates.length === 0}
				<p class="text-sm text-muted-foreground">{t('template.no_templates')}</p>
			{:else}
				<div class="space-y-2">
					{#each templates as tpl (tpl.name)}
						<div
							class="flex items-center justify-between rounded-md border border-border px-3 py-2"
						>
							<div>
								<span class="font-medium text-sm text-foreground">{tpl.name}</span>
								<span class="text-xs text-muted-foreground ml-2">
									{#if tpl.defaultStatus}{tpl.defaultStatus}{/if}
									{#if tpl.defaultPriority}/{tpl.defaultPriority}{/if}
									{#if tpl.defaultType}/{tpl.defaultType}{/if}
								</span>
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								onclick={() => handleDeleteTemplate(tpl.name.replace(/\s+/g, '_').toLowerCase())}
							>
								<Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
							</Button>
						</div>
					{/each}
				</div>
			{/if}

			<Separator />

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateTemplate();
				}}
				class="space-y-3"
			>
				<div class="grid grid-cols-2 gap-2">
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('template.name')}</label>
						<Input
							bind:value={newTemplateName}
							placeholder="Bug Report"
							class="h-8 text-sm"
							required
						/>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('task.title')}</label>
						<Input
							bind:value={newTemplateTitle}
							placeholder={t('template.default_values')}
							class="h-8 text-sm"
						/>
					</div>
				</div>
				<div class="grid grid-cols-4 gap-2">
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('task.status')}</label>
						<Select type="single" bind:value={newTemplateStatus}>
							<SelectTrigger class="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todo">Todo</SelectItem>
								<SelectItem value="in_progress">In Progress</SelectItem>
								<SelectItem value="review">Review</SelectItem>
								<SelectItem value="done">Done</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('task.priority')}</label>
						<Select type="single" bind:value={newTemplatePriority}>
							<SelectTrigger class="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="critical">Critical</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="low">Low</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('task.type')}</label>
						<Select type="single" bind:value={newTemplateType}>
							<SelectTrigger class="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="task">Task</SelectItem>
								<SelectItem value="bug">Bug</SelectItem>
								<SelectItem value="feature">Feature</SelectItem>
								<SelectItem value="improvement">Improvement</SelectItem>
								<SelectItem value="epic">Epic</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-medium">Tags</label>
						<Input bind:value={newTemplateTags} placeholder="tag1,tag2" class="h-8 text-sm" />
					</div>
				</div>
				<Button type="submit" size="sm" disabled={!newTemplateName.trim()}>
					<Plus class="mr-1 h-3.5 w-3.5" />
					{t('template.create')}
				</Button>
			</form>
		</div>

		<Separator />

		<!-- Custom Fields -->
		<div class="rounded-lg border border-border bg-card p-6 space-y-4">
			<h2 class="text-lg font-semibold">{t('custom_field.title')}</h2>

			{#if customFields.size === 0}
				<p class="text-sm text-muted-foreground">{t('custom_field.no_fields')}</p>
			{:else}
				<div class="space-y-2">
					{#each [...customFields.entries()] as [fieldName, fieldDef] (fieldName)}
						<div
							class="flex items-center justify-between rounded-md border border-border px-3 py-2"
						>
							<div class="flex items-center gap-2">
								<span class="font-medium text-sm text-foreground">{fieldDef.label}</span>
								<Badge variant="outline" class="text-[10px]"
									>{t('custom_field.type.' + fieldDef.type)}</Badge
								>
								{#if fieldDef.required}
									<Badge variant="secondary" class="text-[10px]">Required</Badge>
								{/if}
								{#if fieldDef.options?.length}
									<span class="text-xs text-muted-foreground">[{fieldDef.options.join(', ')}]</span>
								{/if}
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								onclick={() => handleDeleteField(fieldName)}
							>
								<Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
							</Button>
						</div>
					{/each}
				</div>
			{/if}

			<Separator />

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateField();
				}}
				class="space-y-3"
			>
				<div class="grid grid-cols-3 gap-2">
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('custom_field.label')}</label>
						<Input
							bind:value={newFieldLabel}
							placeholder="Story Points"
							class="h-8 text-sm"
							required
						/>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('custom_field.type')}</label>
						<Select type="single" bind:value={newFieldType}>
							<SelectTrigger class="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="text">{t('custom_field.type.text')}</SelectItem>
								<SelectItem value="number">{t('custom_field.type.number')}</SelectItem>
								<SelectItem value="select">{t('custom_field.type.select')}</SelectItem>
								<SelectItem value="date">{t('custom_field.type.date')}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-medium">{t('custom_field.options')}</label>
						<Input
							bind:value={newFieldOptions}
							placeholder={t('custom_field.options_placeholder')}
							disabled={newFieldType !== 'select'}
							class="h-8 text-sm"
						/>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-2">
						<Switch bind:checked={newFieldRequired} id="field-required" />
						<label for="field-required" class="text-xs text-muted-foreground cursor-pointer"
							>{t('custom_field.required')}</label
						>
					</div>
					<Button type="submit" size="sm" disabled={!newFieldLabel.trim()}>
						<Plus class="mr-1 h-3.5 w-3.5" />
						{t('custom_field.create')}
					</Button>
				</div>
			</form>
		</div>

		<Separator />

		<!-- Approval Workflow -->
		<div class="rounded-lg border border-border bg-card p-6 space-y-4">
			<div class="flex items-center justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold">{t('approval.config_title')}</h2>
					<p class="text-sm text-muted-foreground">{t('approval.config_desc')}</p>
				</div>
				<Switch bind:checked={approvalEnabled} id="approval-enabled" />
			</div>

			<div class="flex items-end gap-3">
				<div class="space-y-1">
					<label for="approval-required" class="text-xs font-medium">{t('approval.required')}</label
					>
					<Input
						id="approval-required"
						type="number"
						min="1"
						bind:value={approvalRequired}
						disabled={!approvalEnabled}
						class="h-8 w-24 text-sm"
					/>
				</div>
				<Button size="sm" onclick={handleSaveApprovalConfig}>
					<Save class="mr-1 h-3.5 w-3.5" />
					{t('project.settings.save')}
				</Button>
			</div>
		</div>

		<Separator />

		<!-- Git Integration -->
		<div class="rounded-lg border border-border bg-card p-6 space-y-4">
			<h2 class="text-lg font-semibold">{t('git.title')}</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div class="space-y-1">
					<label class="text-xs font-medium">{t('git.provider')}</label>
					<Select type="single" bind:value={gitProvider}>
						<SelectTrigger class="h-8 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="github">{t('git.provider.github')}</SelectItem>
							<SelectItem value="gitlab">{t('git.provider.gitlab')}</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div class="space-y-1">
					<label for="git-repo-url" class="text-xs font-medium">{t('git.repo_url')}</label>
					<Input
						id="git-repo-url"
						bind:value={gitRepoUrl}
						placeholder="https://github.com/org/repo"
						class="h-8 text-sm"
					/>
				</div>
			</div>

			<div class="space-y-1">
				<label for="git-webhook-url" class="text-xs font-medium">{t('git.webhook_url')}</label>
				<Input id="git-webhook-url" value={webhookUrl} readonly class="h-8 font-mono text-xs" />
			</div>

			<div class="flex items-end gap-2">
				<div class="space-y-1 flex-1">
					<label for="git-webhook-secret" class="text-xs font-medium"
						>{t('git.webhook_secret')}</label
					>
					<Input
						id="git-webhook-secret"
						bind:value={gitWebhookSecret}
						class="h-8 font-mono text-xs"
					/>
				</div>
				<Button type="button" variant="outline" size="sm" onclick={handleGenerateSecret}>
					<RefreshCw class="mr-1 h-3.5 w-3.5" />
					{t('git.generate_secret')}
				</Button>
				<Button
					size="sm"
					onclick={handleSaveGitConfig}
					disabled={!gitRepoUrl.trim() || !gitWebhookSecret.trim()}
				>
					<Save class="mr-1 h-3.5 w-3.5" />
					{t('git.save_config')}
				</Button>
			</div>
		</div>

		<Separator />
		<div class="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
			<h2 class="text-lg font-semibold text-destructive">{t('settings.danger_zone')}</h2>
			<p class="text-sm text-muted-foreground">
				{t('project.settings.archive')}
			</p>
			<Button variant="destructive" onclick={handleArchive}>
				<Archive class="mr-1 h-4 w-4" />
				{t('project.settings.archive')}
			</Button>
		</div>
	{:else}
		<div class="text-sm text-muted-foreground text-center py-8">
			{t('common.loading')}
		</div>
	{/if}
</div>
