<script lang="ts">
  import { t } from "$lib/i18n";
  import type { CustomFieldDefinition, CustomFieldValue } from "$lib/matrix/task-types";
  import CustomFieldRenderer from "$lib/components/task/CustomFieldRenderer.svelte";

  interface Props {
    definitions: Map<string, CustomFieldDefinition>;
    values: Map<string, CustomFieldValue>;
    onchange: (fieldName: string, value: string | number) => Promise<void>;
  }

  let { definitions, values, onchange }: Props = $props();
</script>

{#if definitions.size > 0}
  <div>
    <h3 class="text-sm font-medium mb-2">{t("custom_field.title")}</h3>
    <div class="space-y-2">
      {#each definitions as [fieldName, def] (fieldName)}
        <CustomFieldRenderer
          definition={def}
          {fieldName}
          value={values.get(fieldName)}
          {onchange}
        />
      {/each}
    </div>
  </div>
{/if}
