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
  import TaskStatusSelect from "./TaskStatusSelect.svelte";
  import PrioritySelect from "./PrioritySelect.svelte";
  import TaskTypeSelect from "./TaskTypeSelect.svelte";
  import AssigneeSelect from "./AssigneeSelect.svelte";
  import type { MatrixClient } from "matrix-js-sdk";
  import type { TaskStatus, Priority, TaskType } from "$lib/matrix/types";
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
      encrypted?: boolean;
    }) => Promise<void>;
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
  let encrypted = $state(false);
  let isSubmitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    isSubmitting = true;
    try {
      await onSubmit?.({
        name: name.trim(),
        topic: topic.trim() || undefined,
        status,
        priority,
        type,
        assignee,
        encrypted
      });
      // Reset form
      name = "";
      topic = "";
      status = "todo";
      priority = "medium";
      type = "task";
      assignee = undefined;
      encrypted = false;
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
