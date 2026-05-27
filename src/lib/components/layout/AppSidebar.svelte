<script lang="ts">
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator
  } from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";
  import MatrixAvatar from "$lib/components/common/MatrixAvatar.svelte";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getProjectsContext, type ProjectTemplate } from "$lib/stores/projects.svelte";
  import { Switch } from "$lib/components/ui/switch";
  import { Plus, FolderKanban, LogOut, Lock } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
  let projects = getProjectsContext();

  let showCreateProject = $state(false);
  let newProjectName = $state("");
  let projectTemplate = $state<ProjectTemplate>("basic");
  let projectEncrypted = $state(false);

  const templateOptions: { value: ProjectTemplate; labelKey: string }[] = [
    { value: "basic", labelKey: "project.template.basic" },
    { value: "kanban", labelKey: "project.template.kanban" },
    { value: "scrum", labelKey: "project.template.scrum" }
  ];

  async function handleCreateProject() {
    if (!newProjectName.trim() || !auth.client) return;
    await projects.createProject(auth.client, newProjectName.trim(), undefined, projectTemplate, projectEncrypted);
    newProjectName = "";
    projectTemplate = "basic";
    projectEncrypted = false;
    showCreateProject = false;
  }
</script>

<Sidebar>
  <SidebarHeader class="border-b border-border px-4 py-3">
    <div class="flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
        T
      </div>
      <span class="font-semibold text-foreground">Tamarix</span>
    </div>
  </SidebarHeader>

  <SidebarContent>
    <!-- Projects section -->
    <SidebarGroup>
      <SidebarGroupLabel class="flex items-center justify-between">
        <span>{t("breadcrumb.projects")}</span>
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5"
          onclick={() => (showCreateProject = !showCreateProject)}
        >
          <Plus class="h-3.5 w-3.5" />
        </Button>
      </SidebarGroupLabel>

      {#if showCreateProject}
        <div class="px-2 pb-2 space-y-2">
          <form onsubmit={(e) => { e.preventDefault(); handleCreateProject(); }} class="flex gap-1">
            <input
              bind:value={newProjectName}
              placeholder={t("project.name_placeholder")}
              class="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="submit" size="sm" class="h-7 text-xs">{t("common.create")}</Button>
          </form>
          <div>
            <div class="text-[10px] text-muted-foreground mb-1">{t("project.template")}</div>
            <div class="flex gap-1">
              {#each templateOptions as opt}
                <button
                  type="button"
                  class="flex-1 rounded-md border px-1.5 py-1 text-[10px] transition-colors {projectTemplate === opt.value ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/50'}"
                  onclick={() => projectTemplate = opt.value}
                >
                  {t(opt.labelKey)}
                </button>
              {/each}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Switch bind:checked={projectEncrypted} id="project-encrypted" />
            <label for="project-encrypted" class="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
              <Lock class="h-3 w-3" />
              {t('encrypt.label')}
            </label>
          </div>
        </div>
      {/if}

      <SidebarGroupContent>
        <SidebarMenu>
          {#if projects.isLoading}
            <div class="px-2 py-4 text-xs text-muted-foreground">{t("common.loading")}</div>
          {:else if projects.projects.length === 0}
            <div class="px-2 py-4 text-xs text-muted-foreground">{t("project.no_projects_hint")}</div>
          {:else}
            {#each projects.projects as project}
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <a href="/project/{encodeURIComponent(project.roomId)}">
                    <FolderKanban class="h-4 w-4" />
                    <span>{project.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            {/each}
          {/if}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </SidebarContent>

  <SidebarFooter class="border-t border-border">
    <div class="flex items-center gap-2 px-2 py-1">
      <MatrixAvatar
        userId={auth.userId ?? undefined}
        size="sm"
      />
      <div class="flex-1 min-w-0">
        <div class="truncate text-xs text-foreground">{auth.userId ?? ""}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        onclick={() => auth.logout()}
        title={t("menu.logout")}
      >
        <LogOut class="h-3.5 w-3.5" />
      </Button>
    </div>
  </SidebarFooter>

  <SidebarRail />
</Sidebar>
