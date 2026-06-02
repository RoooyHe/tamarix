<script lang="ts">
  import "../app.css";
  import { setAuthContext, getAuthContext } from "$lib/stores/auth.svelte";
  import { setTasksContext } from "$lib/stores/tasks.svelte";
  import { setProjectsContext } from "$lib/stores/projects.svelte";
  import { setCommentsContext } from "$lib/stores/comments.svelte";
  import { setNotificationsContext } from "$lib/stores/notifications.svelte";
  import { setWorklogsContext } from "$lib/stores/worklogs.svelte";
  import { setVersionsContext } from "$lib/stores/versions.svelte";
  import { setRecentTasksContext } from "$lib/stores/recent-tasks.svelte";
  import { setUiContext } from "$lib/stores/ui.svelte";
  import AppShell from "$lib/components/layout/AppShell.svelte";
  import KeyboardShortcuts from "$lib/components/common/KeyboardShortcuts.svelte";
  import CommandPalette from "$lib/components/common/CommandPalette.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { initLocale, t } from "$lib/i18n";
  import { isInputElement } from "$lib/utils/keyboard";
  import type { TaskStatus } from "$lib/matrix/types";
  import { TASK_STATUS_ORDER } from "$lib/matrix/types";

  let { children } = $props();

  // Set up all stores at layout level
  let auth = setAuthContext();
  let tasks = setTasksContext();
  let projects = setProjectsContext();
  let comments = setCommentsContext();
  let notifications = setNotificationsContext();
  let worklogs = setWorklogsContext();
  let versions = setVersionsContext();
  let recentTasks = setRecentTasksContext();
  let ui = setUiContext();

  let isRestoring = $state(true);
  let shortcutsOpen = $state(false);
  let commandPaletteOpen = $state(false);

  onMount(async () => {
    initLocale();
    // Try to restore previous session
    await auth.restore();
    isRestoring = false;

  });

  // Watch for login state changes to load data, start sync listeners, and redirect
  $effect(() => {
    if (auth.isLoggedIn && auth.client) {
      projects.fetchProjects(auth.client);
      projects.startSyncListener(auth.client);
      notifications.startSyncListener(auth.client);
      notifications.startDueCheckTimer(auth.client, () => tasks.tasks);
    } else {
      projects.stopSyncListener();
      notifications.stopSyncListener();
      notifications.stopDueCheckTimer();
    }
  });

  // P4: Global keyboard shortcuts listener
  function handleKeydown(e: KeyboardEvent) {
    // Always allow Cmd/Ctrl+K and Esc
    const isCmdK = (e.metaKey || e.ctrlKey) && e.key === "k";
    const isEsc = e.key === "Escape";

    if (isCmdK) {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
      return;
    }

    if (isEsc) {
      // Close any open dialog/panel
      if (shortcutsOpen) {
        shortcutsOpen = false;
        return;
      }
      if (commandPaletteOpen) {
        commandPaletteOpen = false;
        return;
      }
      return;
    }

    // For single-letter shortcuts, check if user is typing in an input
    if (isInputElement(e.target as HTMLElement)) return;

    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      shortcutsOpen = !shortcutsOpen;
      return;
    }

    // Only process other shortcuts when logged in
    if (!auth.isLoggedIn) return;

    // N: New task
    if (e.key === "n" || e.key === "N") {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "new_task" } }));
        return;
      }
    }

    // E: Edit current task
    if (e.key === "e" || e.key === "E") {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "edit" } }));
        return;
      }
    }

    // 1-5: Set task status
    if (e.key >= "1" && e.key <= "5" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const statusIndex = parseInt(e.key) - 1;
      if (statusIndex < TASK_STATUS_ORDER.length) {
        const targetStatus = TASK_STATUS_ORDER[statusIndex];
        window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "set_status", status: targetStatus } }));
      }
      return;
    }

    // /: Focus search
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "focus_search" } }));
      return;
    }

    if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "toggle_tag" } }));
      return;
    }

    if ((e.key === "a" || e.key === "A") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "assign" } }));
      return;
    }

    if ((e.key === "d" || e.key === "D") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "due_date" } }));
      return;
    }
  }
</script>

<svelte:head>
  <title>Tamarix</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if isRestoring}
  <div class="flex h-screen items-center justify-center bg-background">
    <div class="text-muted-foreground">{t("restore.restoring")}</div>
  </div>
{:else if auth.isLoggedIn}
  <AppShell>
    {@render children()}
  </AppShell>
{:else}
  {@render children()}
{/if}

<KeyboardShortcuts bind:open={shortcutsOpen} />
<CommandPalette bind:open={commandPaletteOpen} />
