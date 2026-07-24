<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Task } from "$lib/matrix/task-types";

  interface Pagination {
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }

  interface Props {
    totalCount: number;
    pagination: Pagination;
  }

  let { totalCount, pagination }: Props = $props();
</script>

{#if totalCount > 0}
  <div class="flex items-center justify-between px-1 flex-wrap gap-2">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
       <span>{t("pagination.per_page")}</span>
      <select
        class="rounded border border-border bg-background px-2 py-1 text-sm"
        bind:value={pagination.pageSize}
        onchange={() => { pagination.currentPage = 1; }}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
       <span>{t("pagination.total", { n: totalCount })}</span>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.currentPage <= 1}
        onclick={() => pagination.currentPage--}
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <span class="text-sm text-muted-foreground">
        {pagination.currentPage} / {pagination.totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.currentPage >= pagination.totalPages}
        onclick={() => pagination.currentPage++}
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
{/if}
