<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { t } from "$lib/i18n";
  import type { CustomFieldDefinition, CustomFieldValue, CustomFieldType } from "$lib/matrix/types";

  interface Props {
    definition: CustomFieldDefinition;
    fieldName: string;
    value?: CustomFieldValue;
    onchange?: (fieldName: string, value: string | number) => void;
    /** When true, show validation error for empty required fields */
    showValidation?: boolean;
    /** Whether the field is read-only */
    readonly?: boolean;
  }

  let {
    definition,
    fieldName,
    value,
    onchange,
    showValidation = false,
    readonly = false
  }: Props = $props();

  let hasError = $derived(
    showValidation && definition.required && (value === undefined || value === null || value?.value === "" || value?.value === undefined || value?.value === null)
  );

  function handleChange(newValue: string | number) {
    onchange?.(fieldName, newValue);
  }

  function handleSelectChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    handleChange(target.value);
  }
</script>

<div class="flex items-center gap-2">
  <span class="text-xs text-muted-foreground w-24 shrink-0">
    {definition.label}
    {#if definition.required}
      <span class="text-red-500">*</span>
    {/if}
  </span>

  {#if definition.type === "select" && definition.options}
    <select
      class="h-7 rounded-md border border-input bg-background px-2 text-xs {hasError ? 'border-red-500' : ''}"
      value={value?.value ?? ""}
      onchange={handleSelectChange}
      disabled={readonly}
    >
      <option value="">--</option>
      {#each definition.options as opt}
        <option value={opt}>{opt}</option>
      {/each}
    </select>
  {:else if definition.type === "number"}
    <Input
      type="number"
      class="h-7 text-xs w-32 {hasError ? 'border-red-500' : ''}"
      value={value?.value ?? ""}
      onchange={(e) => handleChange(Number((e.target as HTMLInputElement).value))}
      disabled={readonly}
    />
  {:else if definition.type === "date"}
    <Input
      type="date"
      class="h-7 text-xs w-36 {hasError ? 'border-red-500' : ''}"
      value={value?.value ?? ""}
      onchange={(e) => handleChange((e.target as HTMLInputElement).value)}
      disabled={readonly}
    />
  {:else}
    <Input
      type="text"
      class="h-7 text-xs flex-1 {hasError ? 'border-red-500' : ''}"
      value={value?.value ?? ""}
      onchange={(e) => handleChange((e.target as HTMLInputElement).value)}
      disabled={readonly}
    />
  {/if}

  {#if hasError}
    <span class="text-[10px] text-red-500">{t("custom_field.required_error")}</span>
  {/if}
</div>
