import type { Component } from "svelte";
import type { LucideProps } from "@lucide/svelte";
import { Bug, Sparkles, ListTodo, Wrench, Target } from "@lucide/svelte";

export type IconComponent = Component<LucideProps>;

export const typeIcon: Record<string, IconComponent> = {
  bug: Bug,
  feature: Sparkles,
  task: ListTodo,
  improvement: Wrench,
  epic: Target,
};

export const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  todo: "outline",
  in_progress: "default",
  review: "secondary",
  done: "secondary",
  closed: "outline",
};

export const priorityColorClass: Record<string, string> = {
  critical: "bg-red-500/20 text-red-500 border-red-500/30",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  low: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
};

export function formatSender(userId: string): string {
  const match = userId.match(/^@([^:]+):/);
  return match ? match[1] : userId;
}
