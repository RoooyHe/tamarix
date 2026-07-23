<script lang="ts">
  import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
  import { Filter, List, LayoutGrid } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Priority, TaskType } from "$lib/matrix/task-types";
  import { PRIORITY_ORDER } from "$lib/matrix/task-types";
  import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/labels";

  interface Filters {
    searchQuery: string;
    filterPriorities: Set<Priority>;
    filterTypes: Set<TaskType>;
    filterAssignees: Set<string>;
    filterTags: Set<string>;
    showArchived: boolean;
    togglePriorityFilter: (p: Priority) => void;
    toggleTypeFilter: (t: TaskType) => void;
    toggleAssigneeFilter: (a: string) => void;
    toggleTagFilter: (tag: string) => void;
    clearFilters: () => void;
  }

  interface Props {
    filters: Filters;
    currentView: "list" | "board";
    onViewChange: (view: "list" | "board") => void;
    isMobile: boolean;
    availableAssignees: string[];
    availableTags: string[];
    searchInputRef?: HTMLInputElement | null;
  }

  let {
    filters,
    currentView: initialView,
    onViewChange,
    isMobile,
    availableAssignees,
    availableTags,
    searchInputRef = $bindable(null),
  }: Props = $props();

  // Local state for Tabs bind:value (can't bind to a prop in Svelte 5)
  let currentView = $state<"list" | "board">(initialView);
  $effect(() => { onViewChange(currentView); });

  let hasActiveFilters = $derived(
    filters.filterPriorities.size > 0 ||
    filters.filterTypes.size > 0 ||
    filters.filterAssignees.size > 0 ||
    filters.filterTags.size > 0 ||
    filters.showArchived ||
    filters.searchQuery.trim() !== ""
  );

  const priorityColorClass: Record<string, string> = {
    critical: "bg-red-500/20 text-red-500 border-red-500/30",
    high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    low: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30"
  };

  function formatSender(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1] : userId;
  }
</script>

<div class="flex items-center gap-3 {isMobile ? 'flex-wrap' : ''}">
  <Tabs bind:value={currentView}>
    <TabsList>
      <TabsTrigger value="list">
        <List class="mr-1 h-4 w-4" />
        {t("list.view")}
      </TabsTrigger>
      <TabsTrigger value="board">
        <LayoutGrid class="mr-1 h-4 w-4" />
        {t("list.board")}
      </TabsTrigger>
    </TabsList>
  </Tabs>

  <div class="flex-1"></div>

  <!-- Search -->
  <Input
    bind:ref={searchInputRef}
    type="search"
    placeholder={t("search.search_tasks")}
    bind:value={filters.searchQuery}
    class={isMobile ? "w-full" : "w-56"}
  />

  <!-- Filter popover -->
  <Popover>
    <PopoverTrigger>
      <Button variant="outline" size="sm" class={hasActiveFilters ? "border-primary" : ""}>
        <Filter class="mr-1 h-4 w-4" />
        {t("common.filter")}
        {#if hasActiveFilters}
          <Badge variant="secondary" class="ml-1 h-5 px-1 text-[10px]">
            {filters.filterPriorities.size + filters.filterTypes.size + filters.filterAssignees.size + filters.filterTags.size}
          </Badge>
        {/if}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-64" align="end">
      <div class="space-y-4">
        <div>
          <h4 class="mb-2 text-sm font-medium">{t("task.priority")}</h4>
          <div class="space-y-2">
            {#each PRIORITY_ORDER as p (p)}
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={filters.filterPriorities.has(p)}
                  onCheckedChange={() => filters.togglePriorityFilter(p)}
                />
                <Badge variant="outline" class={priorityColorClass[p] ?? ""}>
                  {getPriorityLabel(p)}
                </Badge>
              </label>
            {/each}
          </div>
        </div>

        <div>
          <h4 class="mb-2 text-sm font-medium">{t("task.type")}</h4>
          <div class="space-y-2">
            {#each (["bug", "feature", "task", "improvement", "epic"] as TaskType[]) as t (t)}
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={filters.filterTypes.has(t)}
                  onCheckedChange={() => filters.toggleTypeFilter(t)}
                />
                {getTypeLabel(t)}
              </label>
            {/each}
          </div>
        </div>

        {#if availableAssignees.length > 0}
          <div>
            <h4 class="mb-2 text-sm font-medium">{t("task.assignee")}</h4>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              {#each availableAssignees as a (a)}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.filterAssignees.has(a)}
                    onCheckedChange={() => filters.toggleAssigneeFilter(a)}
                  />
                  <span class="text-xs text-muted-foreground">{formatSender(a)}</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        {#if availableTags.length > 0}
          <div>
            <h4 class="mb-2 text-sm font-medium">{t("task.tags")}</h4>
            <div class="flex flex-wrap gap-2">
              {#each availableTags as tag (tag)}
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={filters.filterTags.has(tag)}
                    onCheckedChange={() => filters.toggleTagFilter(tag)}
                  />
                  <Badge variant="outline" class="text-[10px]">{tag}</Badge>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        <div class="border-t border-border pt-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.showArchived}
              onCheckedChange={() => filters.showArchived = !filters.showArchived}
            />
            <span class="text-sm">{t("list.show_archived")}</span>
          </label>
        </div>

        {#if hasActiveFilters}
          <Button variant="ghost" size="sm" class="w-full" onclick={filters.clearFilters}>
            {t("common.clear_filter")}
          </Button>
        {/if}
      </div>
    </PopoverContent>
  </Popover>
</div>
