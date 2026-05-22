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
  import { Field, FieldLabel } from "$lib/components/ui/field";
  import TaskStatusSelect from "./TaskStatusSelect.svelte";
  import PrioritySelect from "./PrioritySelect.svelte";
  import TaskTypeSelect from "./TaskTypeSelect.svelte";
  import type { TaskStatus, Priority, TaskType } from "$lib/matrix/types";
  import { Plus } from "@lucide/svelte";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSubmit?: (data: {
      name: string;
      topic?: string;
      status: TaskStatus;
      priority: Priority;
      type: TaskType;
    }) => Promise<void>;
  }

  let { open = $bindable(false), onOpenChange, onSubmit }: Props = $props();

  let name = $state("");
  let topic = $state("");
  let status: TaskStatus = $state("todo");
  let priority: Priority = $state("medium");
  let type: TaskType = $state("task");
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
        type
      });
      // Reset form
      name = "";
      topic = "";
      status = "todo";
      priority = "medium";
      type = "task";
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
      新建任务
    </Button>
  </DialogTrigger>
  <DialogContent class="sm:max-w-[480px]">
    <DialogHeader>
      <DialogTitle>新建任务</DialogTitle>
      <DialogDescription>创建一个新的 Matrix Room 作为任务</DialogDescription>
    </DialogHeader>
    <form onsubmit={handleSubmit} class="space-y-4">
      <Field>
        <FieldLabel>任务标题</FieldLabel>
        <Input bind:value={name} placeholder="输入任务标题..." required />
      </Field>

      <Field>
        <FieldLabel>描述</FieldLabel>
        <Textarea bind:value={topic} placeholder="输入任务描述..." rows={3} />
      </Field>

      <div class="grid grid-cols-3 gap-3">
        <Field>
          <FieldLabel>状态</FieldLabel>
          <TaskStatusSelect bind:value={status} />
        </Field>

        <Field>
          <FieldLabel>优先级</FieldLabel>
          <PrioritySelect bind:value={priority} />
        </Field>

        <Field>
          <FieldLabel>类型</FieldLabel>
          <TaskTypeSelect bind:value={type} />
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
          取消
        </Button>
        <Button type="submit" disabled={!name.trim() || isSubmitting}>
          {isSubmitting ? "创建中..." : "创建"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
