<script lang="ts">
  import { page } from "$app/stores";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { getVersions, setVersion } from "$lib/matrix/project-versions";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Progress } from "$lib/components/ui/progress";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
  } from "$lib/components/ui/dialog";
  import { ArrowLeft, Plus, FileText, Copy } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { VersionInfo } from "$lib/matrix/task-types";

  let auth = getAuthContext();
  let projects = getProjectsContext();
  let tasks = getTasksContext();

  let versions = $state<VersionInfo[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  function fetchVersions() {
    if (!auth.client || !projectId) return;
    isLoading = true;
    error = null;
    try {
      const room = auth.client.getRoom(projectId);
      versions = room ? getVersions(room) : [];
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_projects");
    } finally {
      isLoading = false;
    }
  }

  async function createVersion(version: VersionInfo) {
    if (!auth.client) return;
    error = null;
    try {
      const versionKey = version.name.replace(/\s+/g, "_").toLowerCase();
      await setVersion(auth.client, projectId, versionKey, version);
      fetchVersions();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create version";
    }
  }

  async function updateVersion(versionKey: string, version: VersionInfo) {
    if (!auth.client) return;
    error = null;
    try {
      await setVersion(auth.client, projectId, versionKey, version);
      fetchVersions();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to update version";
    }
  }

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let project = $derived(projects.getProjectById(projectId));

  // Create version dialog
  let createOpen = $state(false);
  let newName = $state("");
  let newDescription = $state("");
  let newReleaseDate = $state("");
  let newStatus: VersionInfo["status"] = $state("planned");

  // Release notes dialog
  let releaseNotesOpen = $state(false);
  let releaseNotesVersion = $state<string | null>(null);
  let releaseNotesText = $derived.by(() => {
    if (!releaseNotesVersion) return "";
    const versionTasks = tasks.tasks.filter(task => {
      // Check if task has this version linked
      const room = auth.client?.getRoom(task.roomId);
      if (!room) return false;
      const versionEvent = room.currentState.getStateEvents("com.tamarix.task_version" as any, "");
      if (!versionEvent) return false;
      return (versionEvent.getContent() as { version_key: string }).version_key === releaseNotesVersion;
    });
    const doneTasks = versionTasks.filter(t => t.status === "done" || t.status === "closed");
    if (doneTasks.length === 0) return t("version.no_versions");
    return doneTasks.map(t => `- ${t.title}`).join("\n");
  });
  let copied = $state(false);

  // Compute version progress
  let versionProgress = $derived.by(() => {
    const result = new Map<string, { total: number; done: number }>();
    for (const version of versions) {
      const key = version.name.replace(/\s+/g, "_").toLowerCase();
      const versionTasks = tasks.tasks.filter(task => {
        const room = auth.client?.getRoom(task.roomId);
        if (!room) return false;
        const versionEvent = room.currentState.getStateEvents("com.tamarix.task_version" as any, "");
        if (!versionEvent) return false;
        return (versionEvent.getContent() as { version_key: string }).version_key === key;
      });
      const done = versionTasks.filter(t => t.status === "done" || t.status === "closed").length;
      result.set(key, { total: versionTasks.length, done });
    }
    return result;
  });

  // Load data
  $effect(() => {
    if (auth.client && projectId) {
      fetchVersions();
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }
  });

  async function handleCreateVersion() {
    if (!auth.client || !newName.trim()) return;
    const key = newName.trim().replace(/\s+/g, "_").toLowerCase();
    await createVersion({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      releaseDate: newReleaseDate || undefined,
      status: newStatus
    });
    createOpen = false;
    newName = "";
    newDescription = "";
    newReleaseDate = "";
    newStatus = "planned";
  }

  async function handleStatusChange(version: VersionInfo, newStatus: VersionInfo["status"]) {
    if (!auth.client) return;
    const key = version.name.replace(/\s+/g, "_").toLowerCase();
    await updateVersion(key, {
      ...version,
      status: newStatus
    });
  }

  function handleGenerateNotes(key: string) {
    releaseNotesVersion = key;
    releaseNotesOpen = true;
  }

  async function handleCopyNotes() {
    await navigator.clipboard.writeText(releaseNotesText);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" onclick={() => history.back()}>
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <h1 class="text-xl font-bold text-foreground">{t("version.title")}</h1>
      {#if project}
        <Badge variant="outline">{project.name}</Badge>
      {/if}
    </div>
    <Button size="sm" class="gap-1" onclick={() => createOpen = true}>
      <Plus class="h-4 w-4" />
      {t("version.create")}
    </Button>
  </div>

  <!-- Version List -->
  {#if versions.length === 0}
    <div class="text-center py-12 text-muted-foreground">
      <FileText class="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>{t("version.no_versions")}</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each versions as version (version.name)}
        {@const key = version.name.replace(/\s+/g, "_").toLowerCase()}
        {@const progress = versionProgress.get(key)}
        <div class="rounded-lg border border-border bg-card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h3 class="font-semibold text-foreground">{version.name}</h3>
              <Badge variant={
                version.status === "released" ? "default" :
                version.status === "archived" ? "outline" : "secondary"
              }>
                {t("version.status." + version.status)}
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              {#if version.status === "planned"}
                <Button size="sm" variant="outline" onclick={() => handleStatusChange(version, "released")}>
                  {t("version.status.released")}
                </Button>
              {:else if version.status === "released"}
                <Button size="sm" variant="outline" onclick={() => handleStatusChange(version, "archived")}>
                  {t("version.status.archived")}
                </Button>
              {/if}
              <Button size="sm" variant="outline" onclick={() => handleGenerateNotes(key)}>
                {t("version.release_notes.generate")}
              </Button>
            </div>
          </div>

          {#if version.description}
            <p class="text-sm text-muted-foreground">{version.description}</p>
          {/if}

          {#if version.releaseDate}
            <p class="text-xs text-muted-foreground">{t("version.release_date")}: {version.releaseDate}</p>
          {/if}

          {#if progress && progress.total > 0}
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>{t("version.progress")}</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <Progress value={(progress.done / progress.total) * 100} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Version Dialog -->
<Dialog bind:open={createOpen}>
  <DialogContent class="sm:max-w-[440px]">
    <DialogHeader>
      <DialogTitle>{t("version.create")}</DialogTitle>
    </DialogHeader>
    <form onsubmit={(e) => { e.preventDefault(); handleCreateVersion(); }} class="space-y-4">
      <div class="space-y-2">
        <label for="version-name" class="text-sm font-medium">{t("version.name")}</label>
        <Input id="version-name" bind:value={newName} placeholder={t("version.name_placeholder")} required />
      </div>
      <div class="space-y-2">
        <label for="version-desc" class="text-sm font-medium">{t("version.description")}</label>
        <Input id="version-desc" bind:value={newDescription} placeholder={t("version.description")} />
      </div>
      <div class="space-y-2">
        <label for="version-date" class="text-sm font-medium">{t("version.release_date")}</label>
        <Input id="version-date" type="date" bind:value={newReleaseDate} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => createOpen = false}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!newName.trim()}>{t("common.create")}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Release Notes Dialog -->
<Dialog bind:open={releaseNotesOpen}>
  <DialogContent class="sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle>{t("version.release_notes")}</DialogTitle>
    </DialogHeader>
    <pre class="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md max-h-80 overflow-auto">{releaseNotesText}</pre>
    <DialogFooter>
      <Button variant="outline" onclick={handleCopyNotes} class="gap-1">
        <Copy class="h-4 w-4" />
        {copied ? t("version.release_notes.copied") : t("version.release_notes.generate")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
