<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Separator } from "$lib/components/ui/separator";
  import { Badge } from "$lib/components/ui/badge";
  import MemberManager from "$lib/components/project/MemberManager.svelte";
  import TemplateConfig from "$lib/components/project/TemplateConfig.svelte";
  import CustomFieldConfig from "$lib/components/project/CustomFieldConfig.svelte";
  import ApprovalConfig from "$lib/components/project/ApprovalConfig.svelte";
  import GitConfig from "$lib/components/project/GitConfig.svelte";
  import { ArrowLeft, Save, Archive } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
  let projects = getProjectsContext();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let project = $derived(projects.getProjectById(projectId));

  let name = $state("");
  let description = $state("");
  let isSaving = $state(false);

  $effect(() => {
    if (project) {
      name = project.name;
      description = project.description ?? "";
    }
  });

  async function handleSave() {
    if (!auth.client || !project || isSaving) return;
    isSaving = true;
    try {
      await projects.updateProject(auth.client, projectId, {
        name: name.trim(),
        topic: description.trim()
      });
    } finally {
      isSaving = false;
    }
  }

  async function handleArchive() {
    if (!auth.client || !project) return;
    await projects.archiveProject(auth.client, projectId);
    goto("/dashboard");
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-3">
    <Button variant="ghost" size="icon" onclick={() => goto(`/project/${encodeURIComponent(projectId)}`)}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <h1 class="text-xl font-bold text-foreground">{t("project.settings")}</h1>
    {#if project}
      <Badge variant="outline">{project.name}</Badge>
    {/if}
  </div>

  {#if project}
    <!-- Basic Settings -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold">{t("project.settings")}</h2>

      <div class="space-y-2">
        <label for="project-name" class="text-sm font-medium text-foreground">{t("project.settings.name")}</label>
        <Input id="project-name" bind:value={name} placeholder={t("project.name_placeholder")} />
      </div>

      <div class="space-y-2">
        <label for="project-desc" class="text-sm font-medium text-foreground">{t("project.settings.description")}</label>
        <Textarea id="project-desc" bind:value={description} rows={3} placeholder={t("project.no_description")} />
      </div>

      <div class="flex justify-end">
        <Button onclick={handleSave} disabled={isSaving || !name.trim()}>
          <Save class="mr-1 h-4 w-4" />
          {isSaving ? t("common.saving") : t("project.settings.save")}
        </Button>
      </div>
    </div>

    <Separator />

    <!-- Members -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold">{t("project.members")}</h2>
      {#if auth.client}
        <MemberManager client={auth.client} spaceRoomId={projectId} />
      {:else}
        <p class="text-sm text-muted-foreground">{t("settings.not_logged_in")}</p>
      {/if}
    </div>

    <Separator />

    {#if auth.client}
      <TemplateConfig client={auth.client} {projectId} />
      <Separator />
      <CustomFieldConfig client={auth.client} {projectId} />
      <Separator />
      <ApprovalConfig client={auth.client} {projectId} />
      <Separator />
      <GitConfig client={auth.client} {projectId} />
    {/if}

    <Separator />
    <div class="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold text-destructive">{t("settings.danger_zone")}</h2>
      <p class="text-sm text-muted-foreground">
        {t("project.settings.archive")}
      </p>
      <Button variant="destructive" onclick={handleArchive}>
        <Archive class="mr-1 h-4 w-4" />
        {t("project.settings.archive")}
      </Button>
    </div>
  {:else}
    <div class="text-sm text-muted-foreground text-center py-8">
      {t("common.loading")}
    </div>
  {/if}
</div>
