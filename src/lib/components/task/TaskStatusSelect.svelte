<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger
  } from "$lib/components/ui/select";
  import type { TaskStatus } from "$lib/matrix/task-types";
import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/labels";
  import { TASK_STATUS_ORDER } from "$lib/matrix/task-types";
  import { getAllowedNextStatuses } from "$lib/matrix/workflow";
  import { Circle, LoaderCircle, Eye, CircleCheck, CircleOff } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";

  type IconComponent = Component<LucideProps>;

  interface Props {
    value?: TaskStatus;
    onValueChange?: (value: TaskStatus) => void;
    disabled?: boolean;
    /** Current status of the task (for workflow-aware filtering). If not provided, all options are shown. */
    currentStatus?: TaskStatus;
  }

  let { value = $bindable<TaskStatus>("todo"), onValueChange, disabled = false, currentStatus }: Props = $props();

  const statusColorMap: Record<TaskStatus, string> = {
    todo: "bg-muted-foreground/20 text-muted-foreground",
    in_progress: "bg-primary/20 text-primary",
    review: "bg-yellow-500/20 text-yellow-500",
    done: "bg-green-500/20 text-green-500",
    closed: "bg-muted-foreground/10 text-muted-foreground line-through"
  };

  const statusIconMap: Record<TaskStatus, IconComponent> = {
    todo: Circle,
    in_progress: LoaderCircle,
    review: Eye,
    done: CircleCheck,
    closed: CircleOff
  };

  let currentIcon = $derived(statusIconMap[value]);

  /** If currentStatus is provided, only show allowed transitions + current status */
  let visibleStatuses = $derived.by(() => {
    if (!currentStatus) return TASK_STATUS_ORDER;
    const allowed = getAllowedNextStatuses(currentStatus);
    // Always include the current status itself
    return TASK_STATUS_ORDER.filter(s => s === currentStatus || allowed.includes(s));
  });
</script>

<Select
  type="single"
  value={value}
  onValueChange={(v) => onValueChange?.(v as TaskStatus)}
  {disabled}
>
  <SelectTrigger class="w-[140px]">
    <span class={statusColorMap[value] + " inline-flex items-center gap-1.5"}>
      <currentIcon class="h-3.5 w-3.5"></currentIcon>
      {getStatusLabel(value)}
    </span>
  </SelectTrigger>
  <SelectContent>
    {#each visibleStatuses as status}
      <SelectItem value={status}>
        {@const Ic = statusIconMap[status]}
        <span class={statusColorMap[status] + " inline-flex items-center gap-1.5"}>
          <Ic class="h-3.5 w-3.5" />
          {getStatusLabel(status)}
        </span>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
