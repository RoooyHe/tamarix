<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger
  } from "$lib/components/ui/select";
  import type { Priority } from "$lib/matrix/types";
  import { PRIORITY_LABELS, PRIORITY_ORDER } from "$lib/matrix/types";
  import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";

  type IconComponent = Component<LucideProps>;

  interface Props {
    value?: Priority;
    onValueChange?: (value: Priority) => void;
    disabled?: boolean;
  }

  let { value = $bindable<Priority>("medium"), onValueChange, disabled = false }: Props = $props();

  const priorityColorMap: Record<Priority, string> = {
    critical: "bg-red-500/20 text-red-500",
    high: "bg-orange-500/20 text-orange-500",
    medium: "bg-yellow-500/20 text-yellow-500",
    low: "bg-muted-foreground/20 text-muted-foreground"
  };

  const priorityIconMap: Record<Priority, IconComponent> = {
    critical: AlertTriangle,
    high: ArrowUp,
    medium: Minus,
    low: ArrowDown
  };

  let currentIcon = $derived(priorityIconMap[value]);
</script>

<Select
  type="single"
  value={value}
  onValueChange={(v) => onValueChange?.(v as Priority)}
  {disabled}
>
  <SelectTrigger class="w-[120px]">
    <span class={priorityColorMap[value] + " inline-flex items-center gap-1.5"}>
      <currentIcon class="h-3.5 w-3.5"></currentIcon>
      {PRIORITY_LABELS[value]}
    </span>
  </SelectTrigger>
  <SelectContent>
    {#each PRIORITY_ORDER as priority}
      <SelectItem value={priority}>
        {@const Ic = priorityIconMap[priority]}
        <span class={priorityColorMap[priority] + " inline-flex items-center gap-1.5"}>
          <Ic class="h-3.5 w-3.5" />
          {PRIORITY_LABELS[priority]}
        </span>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
