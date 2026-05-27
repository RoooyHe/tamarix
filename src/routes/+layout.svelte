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
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { initLocale, t } from "$lib/i18n";

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

  onMount(async () => {
    initLocale();
    // Try to restore previous session
    await auth.restore();
    isRestoring = false;

    // If logged in, load initial data and start sync listeners
    if (auth.isLoggedIn && auth.client) {
      projects.fetchProjects(auth.client);
      projects.startSyncListener(auth.client);
    }
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
</script>

<svelte:head>
  <title>Tamarix</title>
</svelte:head>

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
