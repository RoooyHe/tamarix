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
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { Plus, FolderKanban, LogOut } from "@lucide/svelte";

  let auth = getAuthContext();
  let projects = getProjectsContext();

  let showCreateProject = $state(false);
  let newProjectName = $state("");

  async function handleCreateProject() {
    if (!newProjectName.trim() || !auth.client) return;
    await projects.createProject(auth.client, newProjectName.trim());
    newProjectName = "";
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
        <span>项目</span>
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
        <div class="px-2 pb-2">
          <form onsubmit={(e) => { e.preventDefault(); handleCreateProject(); }} class="flex gap-1">
            <input
              bind:value={newProjectName}
              placeholder="项目名称..."
              class="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="submit" size="sm" class="h-7 text-xs">创建</Button>
          </form>
        </div>
      {/if}

      <SidebarGroupContent>
        <SidebarMenu>
          {#if projects.isLoading}
            <div class="px-2 py-4 text-xs text-muted-foreground">加载中...</div>
          {:else if projects.projects.length === 0}
            <div class="px-2 py-4 text-xs text-muted-foreground">暂无项目，点击 + 创建</div>
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
        title="退出登录"
      >
        <LogOut class="h-3.5 w-3.5" />
      </Button>
    </div>
  </SidebarFooter>

  <SidebarRail />
</Sidebar>
