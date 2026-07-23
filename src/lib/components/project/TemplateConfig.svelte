<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Separator } from "$lib/components/ui/separator";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from "$lib/components/ui/select";
  import { Plus, Trash2 } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { TaskTemplate, TaskStatus, Priority, TaskType } from "$lib/matrix/task-types";
  import { createTaskTemplate, getTaskTemplates, deleteTaskTemplate } from "$lib/matrix/templates";
  import type { MatrixClient } from "matrix-js-sdk";

  interface Props {
    client: MatrixClient;
    projectId: string;
  }

  let { client, projectId }: Props = $props();

  let templates = $state<TaskTemplate[]>([]);
  let newName = $state("");
  let newTitle = $state("");
  let newDesc = $state("");
  let newStatus: TaskStatus = $state("todo");
  let newPriority: Priority = $state("medium");
  let newType: TaskType = $state("task");
  let newTags = $state("");

  function load() {
    const room = client.getRoom(projectId);
    if (room) templates = getTaskTemplates(room);
  }

  $effect(() => { load(); });

  async function handleCreate() {
    if (!newName.trim()) return;
    await createTaskTemplate(client, projectId, {
      name: newName.trim(),
      defaultTitle: newTitle.trim() || undefined,
      defaultDescription: newDesc.trim() || undefined,
      defaultStatus: newStatus,
      defaultPriority: newPriority,
      defaultType: newType,
      defaultTags: newTags.trim() ? newTags.split(",").map(s => s.trim()).filter(Boolean) : undefined
    });
    newName = "";
    newTitle = "";
    newDesc = "";
    newStatus = "todo";
    newPriority = "medium";
    newType = "task";
    newTags = "";
    load();
  }

  async function handleDelete(stateKey: string) {
    await deleteTaskTemplate(client, projectId, stateKey);
    load();
  }
</script>

<div class="rounded-lg border border-border bg-card p-6 space-y-4">
  <h2 class="text-lg font-semibold">{t("template.title")}</h2>

  {#if templates.length === 0}
    <p class="text-sm text-muted-foreground">{t("template.no_templates")}</p>
  {:else}
    <div class="space-y-2">
      {#each templates as tpl (tpl.name)}
        <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
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
            onclick={() => handleDelete(tpl.name.replace(/\s+/g, "_").toLowerCase())}
          >
            <Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      {/each}
    </div>
  {/if}

  <Separator />

  <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-3">
    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("template.name")}</label>
        <Input bind:value={newName} placeholder="Bug Report" class="h-8 text-sm" required />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("task.title")}</label>
        <Input bind:value={newTitle} placeholder={t("template.default_values")} class="h-8 text-sm" />
      </div>
    </div>
    <div class="grid grid-cols-4 gap-2">
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("task.status")}</label>
        <Select type="single" bind:value={newStatus}>
          <SelectTrigger class="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("task.priority")}</label>
        <Select type="single" bind:value={newPriority}>
          <SelectTrigger class="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("task.type")}</label>
        <Select type="single" bind:value={newType}>
          <SelectTrigger class="h-8 text-sm"><SelectValue /></SelectTrigger>
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
        <Input bind:value={newTags} placeholder="tag1,tag2" class="h-8 text-sm" />
      </div>
    </div>
    <Button type="submit" size="sm" disabled={!newName.trim()}>
      <Plus class="mr-1 h-3.5 w-3.5" />
      {t("template.create")}
    </Button>
  </form>
</div>
