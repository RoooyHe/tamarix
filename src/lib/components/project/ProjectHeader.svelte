<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
  } from "$lib/components/ui/dropdown-menu";
  import { Download, Upload, Settings, Milestone, BarChart3 } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Project } from "$lib/matrix/types";

  interface Props {
    project: Project | undefined;
    projectId: string;
    isMobile: boolean;
    onExportCSV: () => void;
    onExportJSON: () => void;
    onImport: () => void;
    onCreateTask: () => void;
  }

  let { project, projectId, isMobile, onExportCSV, onExportJSON, onImport, onCreateTask }: Props = $props();
</script>

<div class="flex items-center justify-between {isMobile ? 'flex-col gap-2' : ''}">
  <div>
    <h1 class="{isMobile ? 'text-lg' : 'text-2xl'} font-bold text-foreground">{project?.name ?? t("breadcrumb.projects")}</h1>
    {#if project?.description}
      <p class="text-sm text-muted-foreground">{project.description}</p>
    {/if}
  </div>
  <div class="flex items-center gap-2 {isMobile ? 'w-full' : ''}">
    <Button
      variant="ghost"
      size="sm"
      onclick={() => goto(`/project/${encodeURIComponent(projectId)}/versions`)}
      title={t("version.title")}
    >
      <Milestone class="mr-1 h-4 w-4" />
      {t("version.title")}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onclick={() => goto(`/project/${encodeURIComponent(projectId)}/reports`)}
      title={t("reports.title")}
    >
      <BarChart3 class="mr-1 h-4 w-4" />
      {t("reports.title")}
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          <Download class="mr-1 h-4 w-4" />
          {t("export.title")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onclick={onExportCSV}>
          <Download class="mr-2 h-4 w-4" />
          {t("export.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem onclick={onExportJSON}>
          <Download class="mr-2 h-4 w-4" />
          {t("export.json")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onclick={onImport}>
          <Upload class="mr-2 h-4 w-4" />
          {t("import.title")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button
      variant="outline"
      size="sm"
      onclick={() => goto(`/project/${encodeURIComponent(projectId)}/settings`)}
    >
      <Settings class="mr-1 h-4 w-4" />
      {t("project.settings")}
    </Button>
  </div>
</div>
