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
  import NotificationPanel from "$lib/components/notification/NotificationPanel.svelte";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { SidebarTrigger } from "$lib/components/ui/sidebar";
  import { LogOut, Settings, Search, Sun, Moon, Monitor, Globe } from "@lucide/svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getUiContext } from "$lib/stores/ui.svelte";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
  let ui = getUiContext();
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
      items.push({ label: t("breadcrumb.projects"), href: "/dashboard" });
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
      items.push({ label: t("breadcrumb.dashboard") });
    } else if (segments[0] === "settings") {
      items.push({ label: t("breadcrumb.settings") });
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
    <span class="text-xs hidden sm:inline">{t("search.title")}</span>
    <kbd class="pointer-events-none ml-1 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
  </Button>

  <!-- Notifications -->
  <NotificationPanel />

  <!-- Theme toggle -->
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon" class="h-8 w-8">
        <Sun class="h-4 w-4 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
        <Moon class="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onclick={() => ui.setTheme('light')}>
        <Sun class="h-4 w-4" />
        {t("theme.light")}
        {#if ui.theme === 'light'}<span class="ml-auto">✓</span>{/if}
      </DropdownMenuItem>
      <DropdownMenuItem onclick={() => ui.setTheme('dark')}>
        <Moon class="h-4 w-4" />
        {t("theme.dark")}
        {#if ui.theme === 'dark'}<span class="ml-auto">✓</span>{/if}
      </DropdownMenuItem>
      <DropdownMenuItem onclick={() => ui.setTheme('system')}>
        <Monitor class="h-4 w-4" />
        {t("theme.system")}
        {#if ui.theme === 'system'}<span class="ml-auto">✓</span>{/if}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <!-- Language switch -->
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon" class="h-8 w-8 hidden sm:flex">
        <Globe class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onclick={() => ui.setLocale('zh')}>
        🇨🇳 {t("menu.language_zh")}
        {#if ui.locale === 'zh'}<span class="ml-auto">✓</span>{/if}
      </DropdownMenuItem>
      <DropdownMenuItem onclick={() => ui.setLocale('en')}>
        🇺🇸 {t("menu.language_en")}
        {#if ui.locale === 'en'}<span class="ml-auto">✓</span>{/if}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

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
        {t("menu.settings")}
      </DropdownMenuItem>
      <DropdownMenuItem class="gap-2 text-destructive" onclick={() => auth.logout()}>
        <LogOut class="h-4 w-4" />
        {t("menu.logout")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</header>

<CommandPalette bind:open={commandPaletteOpen} />
