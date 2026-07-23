<script lang="ts">
  import { Separator } from "$lib/components/ui/separator";
  import { t } from "$lib/i18n";
  import type { Task, VersionInfo } from "$lib/matrix/task-types";
  import type { TaskDetailsState } from "$lib/stores/task-details";
  import VersionSelect from "$lib/components/task/VersionSelect.svelte";
  import ApprovalPanel from "$lib/components/task/ApprovalPanel.svelte";
  import CustomFieldsPanel from "$lib/components/task/CustomFieldsPanel.svelte";
  import ExternalLinksPanel from "$lib/components/task/ExternalLinksPanel.svelte";
  import GitCommitsPanel from "$lib/components/task/GitCommitsPanel.svelte";

  interface Props {
    task: Task;
    versions: VersionInfo[];
    details: TaskDetailsState;
  }

  let { task, versions, details }: Props = $props();
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
      {versions}
      value={details.currentVersion}
      onValueChange={details.handleVersionChange}
    />
  </div>

  <!-- Approval -->
  <Separator />
  <ApprovalPanel
    approvalState={details.approvalState}
    approvalConfig={details.approvalConfig}
    onRequestApproval={details.handleRequestApproval}
    onApprove={details.handleApprove}
    onReject={details.handleReject}
  />

  <!-- Custom Fields -->
  <Separator />
  <CustomFieldsPanel
    definitions={details.customFieldDefs}
    values={details.customFieldValues}
    onchange={details.handleCustomFieldChange}
  />

  <!-- External Links -->
  <Separator />
  <ExternalLinksPanel
    links={details.externalLinks}
    onAdd={details.handleAddExternalLink}
    onRemove={details.handleRemoveExternalLink}
  />

  <!-- Git linked commits -->
  <Separator />
  <GitCommitsPanel commits={details.commitLinks} />
</div>
