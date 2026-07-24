<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import { Switch } from "$lib/components/ui/switch";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from "$lib/components/ui/select";
  import { Plus, Trash2 } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { CustomFieldType, CustomFieldDefinition } from "$lib/matrix/task-types";
  import { setCustomFieldDefinition, getCustomFieldDefinitions, deleteCustomFieldDefinition } from "$lib/matrix/custom-fields";
  import type { MatrixClient } from "matrix-js-sdk";

  interface Props {
    client: MatrixClient;
    projectId: string;
  }

  let { client, projectId }: Props = $props();

  let fields = $state<Map<string, CustomFieldDefinition>>(new Map());
  let newLabel = $state("");
  let newType: CustomFieldType = $state("text");
  let newOptions = $state("");
  let newRequired = $state(false);

  function load() {
    const room = client.getRoom(projectId);
    if (room) fields = getCustomFieldDefinitions(room);
  }

  $effect(() => { load(); });

  async function handleCreate() {
    if (!newLabel.trim()) return;
    const fieldName = newLabel.trim().replace(/\s+/g, "_").toLowerCase();
    await setCustomFieldDefinition(client, projectId, fieldName, {
      label: newLabel.trim(),
      type: newType,
      options: newType === "select" && newOptions.trim()
        ? newOptions.split(",").map(s => s.trim()).filter(Boolean)
        : undefined,
      required: newRequired
    });
    newLabel = "";
    newType = "text";
    newOptions = "";
    newRequired = false;
    load();
  }

  async function handleDelete(fieldName: string) {
    await deleteCustomFieldDefinition(client, projectId, fieldName);
    load();
  }
</script>

<div class="rounded-lg border border-border bg-card p-6 space-y-4">
  <h2 class="text-lg font-semibold">{t("custom_field.title")}</h2>

  {#if fields.size === 0}
    <p class="text-sm text-muted-foreground">{t("custom_field.no_fields")}</p>
  {:else}
    <div class="space-y-2">
      {#each [...fields.entries()] as [fieldName, fieldDef] (fieldName)}
        <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm text-foreground">{fieldDef.label}</span>
            <Badge variant="outline" class="text-[10px]">{t("custom_field.type." + fieldDef.type)}</Badge>
            {#if fieldDef.required}
              <Badge variant="secondary" class="text-[10px]">Required</Badge>
            {/if}
            {#if fieldDef.options?.length}
              <span class="text-xs text-muted-foreground">[{fieldDef.options.join(", ")}]</span>
            {/if}
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            onclick={() => handleDelete(fieldName)}
          >
            <Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      {/each}
    </div>
  {/if}

  <Separator />

  <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-3">
    <div class="grid grid-cols-3 gap-2">
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("custom_field.label")}</label>
        <Input bind:value={newLabel} placeholder="Story Points" class="h-8 text-sm" required />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("custom_field.type")}</label>
        <Select type="single" bind:value={newType}>
          <SelectTrigger class="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">{t("custom_field.type.text")}</SelectItem>
            <SelectItem value="number">{t("custom_field.type.number")}</SelectItem>
            <SelectItem value="select">{t("custom_field.type.select")}</SelectItem>
            <SelectItem value="date">{t("custom_field.type.date")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium">{t("custom_field.options")}</label>
        <Input
          bind:value={newOptions}
          placeholder={t("custom_field.options_placeholder")}
          disabled={newType !== "select"}
          class="h-8 text-sm"
        />
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <Switch bind:checked={newRequired} id="field-required" />
        <label for="field-required" class="text-xs text-muted-foreground cursor-pointer">{t("custom_field.required")}</label>
      </div>
      <Button type="submit" size="sm" disabled={!newLabel.trim()}>
        <Plus class="mr-1 h-3.5 w-3.5" />
        {t("custom_field.create")}
      </Button>
    </div>
  </form>
</div>
