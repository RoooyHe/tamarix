<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Switch } from "$lib/components/ui/switch";
  import { Field, FieldLabel } from "$lib/components/ui/field";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import TaskStatusSelect from "./TaskStatusSelect.svelte";
  import PrioritySelect from "./PrioritySelect.svelte";
  import TaskTypeSelect from "./TaskTypeSelect.svelte";
  import AssigneeSelect from "./AssigneeSelect.svelte";
  import CustomFieldRenderer from "./CustomFieldRenderer.svelte";
  import type { MatrixClient } from "matrix-js-sdk";
  import type { TaskStatus, Priority, TaskType, TaskTemplate, CustomFieldDefinition, CustomFieldValue } from "$lib/matrix/types";
  import { getTaskTemplates, getCustomFieldDefinitions, setCustomFieldValue } from "$lib/matrix/state-events";
  import { Plus, Lock } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSubmit?: (data: {
      name: string;
      topic?: string;
      status: TaskStatus;
      priority: Priority;
      type: TaskType;
      assignee?: string;
      tags?: string[];
      encrypted?: boolean;
    }) => Promise<string | void>;
    client?: MatrixClient;
    projectRoomId?: string;
  }

  let { open = $bindable(false), onOpenChange, onSubmit, client, projectRoomId }: Props = $props();

  let name = $state("");
  let topic = $state("");
  let status: TaskStatus = $state("todo");
  let priority: Priority = $state("medium");
  let type: TaskType = $state("task");
  let assignee: string | undefined = $state(undefined);
  let tags = $state("");
  let encrypted = $state(false);
  let isSubmitting = $state(false);
  let templates = $state<TaskTemplate[]>([]);
  let selectedTemplate = $state<string>("__none__");
  let customFieldDefs = $state<Map<string, CustomFieldDefinition>>(new Map());
  let customFieldValues = $state<Map<string, CustomFieldValue>>(new Map());
  let showValidation = $state(false);

  // Load templates when dialog opens or client/project changes
  $effect(() => {
    if (open && client && projectRoomId) {
      const room = client.getRoom(projectRoomId);
      if (room) {
        templates = getTaskTemplates(room);
        customFieldDefs = getCustomFieldDefinitions(room);
      }
    }
  });

  function handleTemplateChange(val: string) {
    selectedTemplate = val;
    if (val === "__none__") return;
    const tmpl = templates.find(t => t.name === val);
    if (!tmpl) return;
    // Apply template defaults
    if (tmpl.defaultTitle) name = tmpl.defaultTitle;
    if (tmpl.defaultDescription) topic = tmpl.defaultDescription;
    if (tmpl.defaultStatus) status = tmpl.defaultStatus;
    if (tmpl.defaultPriority) priority = tmpl.defaultPriority;
    if (tmpl.defaultType) type = tmpl.defaultType;
    if (tmpl.defaultTags?.length) tags = tmpl.defaultTags.join(", ");
  }

  function handleCustomFieldChange(fieldName: string, value: string | number) {
    const next = new Map(customFieldValues);
    next.set(fieldName, { value });
    customFieldValues = next;
  }

  function hasMissingRequiredCustomFields() {
    for (const [fieldName, definition] of customFieldDefs) {
      if (!definition.required) continue;
      const value = customFieldValues.get(fieldName)?.value;
      if (value === undefined || value === null || value === "") return true;
    }
    return false;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    showValidation = true;
    if (hasMissingRequiredCustomFields()) return;

    isSubmitting = true;
    try {
      const createdRoomId = await onSubmit?.({
        name: name.trim(),
        topic: topic.trim() || undefined,
        status,
        priority,
        type,
        assignee,
        tags: tags.trim() ? tags.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        encrypted
      });

      if (client && createdRoomId) {
        for (const [fieldName, fieldValue] of customFieldValues) {
          if (fieldValue.value === "" || fieldValue.value === undefined || fieldValue.value === null) continue;
          await setCustomFieldValue(client, createdRoomId, fieldName, fieldValue.value);
        }
      }

      // Reset form
      name = "";
      topic = "";
      status = "todo";
      priority = "medium";
      type = "task";
      assignee = undefined;
      tags = "";
      encrypted = false;
      selectedTemplate = "__none__";
      customFieldValues = new Map();
      showValidation = false;
      open = false;
    } finally {
      isSubmitting = false;
    }
  }

  function handleOpenChange(value: boolean) {
    open = value;
    onOpenChange?.(value);
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogTrigger>
    <Button size="sm" class="gap-1">
      <Plus class="h-4 w-4" />
      {t("task.create")}
    </Button>
  </DialogTrigger>
  <DialogContent class="sm:max-w-[540px]">
    <DialogHeader>
      <DialogTitle>{t("task.create")}</DialogTitle>
      <DialogDescription>{t("task.create_desc")}</DialogDescription>
    </DialogHeader>
    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- P4: Template selection -->
      {#if templates.length > 0}
        <Field>
          <FieldLabel>{t("template.select")}</FieldLabel>
          <Select type="single" value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger class="w-full">
              <span>{selectedTemplate === "__none__" ? t("template.select") : selectedTemplate}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">--</SelectItem>
              {#each templates as tmpl (tmpl.name)}
                <SelectItem value={tmpl.name}>{tmpl.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </Field>
      {/if}

      <Field>
        <FieldLabel>{t("task.title")}</FieldLabel>
        <Input bind:value={name} placeholder={t("task.title_placeholder")} required />
      </Field>

      <Field>
        <FieldLabel>{t("task.description")}</FieldLabel>
        <Textarea bind:value={topic} placeholder={t("task.description_placeholder")} rows={3} />
      </Field>

      <div class="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>{t("task.status")}</FieldLabel>
          <TaskStatusSelect bind:value={status} />
        </Field>

        <Field>
          <FieldLabel>{t("task.priority")}</FieldLabel>
          <PrioritySelect bind:value={priority} />
        </Field>

        <Field>
          <FieldLabel>{t("task.type")}</FieldLabel>
          <TaskTypeSelect bind:value={type} />
        </Field>

        <Field>
          <FieldLabel>{t("task.assignee")}</FieldLabel>
          {#if client && projectRoomId}
            <AssigneeSelect {client} {projectRoomId} bind:value={assignee} />
          {:else}
            <Input value="-" disabled class="text-muted-foreground" />
          {/if}
        </Field>
      </div>

      <Field>
        <FieldLabel>{t("task.tags")}</FieldLabel>
        <Input bind:value={tags} placeholder="tag1, tag2" />
      </Field>

      {#if customFieldDefs.size > 0}
        <div class="space-y-2 rounded-md border border-border px-3 py-2.5">
          <div class="text-sm font-medium text-foreground">{t("custom_field.title")}</div>
          {#each customFieldDefs as [fieldName, definition] (fieldName)}
            <CustomFieldRenderer
              {definition}
              {fieldName}
              value={customFieldValues.get(fieldName)}
              onchange={handleCustomFieldChange}
              {showValidation}
            />
          {/each}
        </div>
      {/if}

      <div class="rounded-md border border-border px-3 py-2.5">
        <div class="flex items-center justify-between">
          <label for="task-encrypted" class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <Lock class="h-3.5 w-3.5 text-muted-foreground" />
            {t("encrypt.task_option")}
          </label>
          <Switch bind:checked={encrypted} id="task-encrypted" />
        </div>
        {#if encrypted}
          <p class="mt-1.5 text-xs text-muted-foreground">{t("encrypt.warning_as")}</p>
        {/if}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!name.trim() || isSubmitting}>
          {isSubmitting ? t("common.creating") : t("common.create")}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
