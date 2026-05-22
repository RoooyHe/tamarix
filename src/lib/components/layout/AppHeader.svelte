<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
  } from "$lib/components/ui/breadcrumb";
  import { Button } from "$lib/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
  } from "$lib/components/ui/dropdown-menu";
  import MatrixAvatar from "$lib/components/common/MatrixAvatar.svelte";
  import CommandPalette from "$lib/components/common/CommandPalette.svelte";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { SidebarTrigger } from "$lib/components/ui/sidebar";
  import { LogOut, Settings, Search } from "@lucide/svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  let auth = getAuthContext();
  let projects = getProjectsContext();
  let tasks = getTasksContext();

  let commandPaletteOpen = $state(false);

  function openCommandPalette() {
    commandPaletteOpen = true;
  }

  // Build breadcrumb from current URL
  let breadcrumbs = $derived.by(() => {
    const pathname = $page.url.pathname;
    const segments = pathname.split("/").filter(Boolean);

    const items: { label: string; href?: string }[] = [];

    if (segments[0] === "project" && segments[1]) {
      const projectId = decodeURIComponent(segments[1]);
      const project = projects.getProjectById(projectId);
      items.push({ label: "项目", href: "/dashboard" });
      items.push({
        label: project?.name ?? projectId,
        href: `/project/${encodeURIComponent(projectId)}`
      });
      if (segments[2] === "task" && segments[3]) {
        const taskId = decodeURIComponent(segments[3]);
        const task = tasks.getTaskById(taskId);
        items.push({ label: task?.title ?? taskId });
      }
    } else if (segments[0] === "dashboard") {
      items.push({ label: "仪表盘" });
    } else if (segments[0] === "settings") {
      items.push({ label: "设置" });
    }

    return items;
  });
</script>

<header class="flex h-12 items-center gap-3 border-b border-border px-4">
  <SidebarTrigger />

  {#if breadcrumbs.length > 0}
    <Breadcrumb>
      <BreadcrumbList>
        {#each breadcrumbs as item, i}
          {#if i > 0}
            <BreadcrumbSeparator />
          {/if}
          <BreadcrumbItem>
            {#if item.href}
              <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
            {:else if i === breadcrumbs.length - 1}
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            {:else}
              <span class="text-muted-foreground">{item.label}</span>
            {/if}
          </BreadcrumbItem>
        {/each}
      </BreadcrumbList>
    </Breadcrumb>
  {/if}

  <div class="flex-1"></div>

  <!-- Search button (⌘K) -->
  <Button variant="outline" size="sm" class="h-7 gap-2 text-muted-foreground" onclick={openCommandPalette}>
    <Search class="h-3.5 w-3.5" />
    <span class="text-xs">搜索</span>
    <kbd class="pointer-events-none ml-1 inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
  </Button>

  <!-- User menu -->
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full">
        <MatrixAvatar userId={auth.userId ?? undefined} size="xs" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem class="text-xs text-muted-foreground">
        {auth.userId ?? ""}
      </DropdownMenuItem>
      <DropdownMenuItem onclick={() => goto("/settings")}>
        <Settings class="h-4 w-4" />
        设置
      </DropdownMenuItem>
      <DropdownMenuItem class="gap-2 text-destructive" onclick={() => auth.logout()}>
        <LogOut class="h-4 w-4" />
        退出登录
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</header>

<CommandPalette bind:open={commandPaletteOpen} />
