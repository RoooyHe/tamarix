<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger
  } from "$lib/components/ui/select";
  import type { TaskType } from "$lib/matrix/task-types";
  import { getTypeLabel } from "$lib/matrix/labels";
  import { Bug, Sparkles, ListTodo, Wrench, Target } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";

  type IconComponent = Component<LucideProps>;

  interface Props {
    value?: TaskType;
    onValueChange?: (value: TaskType) => void;
    disabled?: boolean;
  }

  let { value = $bindable<TaskType>("task"), onValueChange, disabled = false }: Props = $props();

  const typeOptions: TaskType[] = ["bug", "feature", "task", "improvement", "epic"];

  const typeIconMap: Record<TaskType, IconComponent> = {
    bug: Bug,
    feature: Sparkles,
    task: ListTodo,
    improvement: Wrench,
    epic: Target
  };

  let currentIcon = $derived(typeIconMap[value]);
</script>

<Select
  type="single"
  value={value}
  onValueChange={(v) => onValueChange?.(v as TaskType)}
  {disabled}
>
  <SelectTrigger class="w-[140px]">
    <span class="inline-flex items-center gap-1.5">
      <currentIcon class="h-4 w-4"></currentIcon>
      {getTypeLabel(value)}
    </span>
  </SelectTrigger>
  <SelectContent>
    {#each typeOptions as taskType}
      <SelectItem value={taskType}>
        {@const Ic = typeIconMap[taskType]}
        <span class="inline-flex items-center gap-1.5">
          <Ic class="h-4 w-4" />
          {getTypeLabel(taskType)}
        </span>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
