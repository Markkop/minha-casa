<script lang="ts">
  import { Check } from "@lucide/svelte";
  import {
    formatMergeValue,
    groupMergeFields,
    isFieldEditable,
    type MergeReviewField,
    type MergeReviewSuggestion
  } from "$lib/components/listings/merge-review";

  let {
    fields,
    suggestions = {},
    selectedFieldPaths,
    fieldValues,
    onToggleField,
    onFieldValueChange
  } = $props<{
    fields: MergeReviewField[];
    suggestions?: Record<string, MergeReviewSuggestion>;
    selectedFieldPaths: string[];
    fieldValues: Record<string, string | number | boolean>;
    onToggleField: (path: string, selected: boolean) => void;
    onFieldValueChange: (path: string, value: string) => void;
  }>();

  const groupedFields = $derived(groupMergeFields(fields));

  function textValue(path: string): string {
    const value = fieldValues[path];
    return typeof value === "string" ? value : "";
  }

  function displayedIncomingValue(field: MergeReviewField): unknown {
    const suggestion = suggestions[field.path];
    return suggestion !== undefined ? suggestion.suggestedValue : field.incomingValue;
  }
</script>

{#if fields.length > 0}
  <div class="space-y-5">
    <div class="mb-3 hidden grid-cols-[minmax(10rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
      <span>Campo</span>
      <span>Importado</span>
      <span>Atual</span>
    </div>

    {#each groupedFields as [group, groupFields]}
      <section aria-labelledby={`merge-group-${group}`}>
        <h3 id={`merge-group-${group}`} class="mb-2 text-sm font-semibold text-app-fg">{group}</h3>
        <div class="overflow-hidden rounded-lg border border-app-border">
          {#each groupFields as field}
            <div
              class="grid gap-3 border-b border-app-border p-3 last:border-b-0 md:grid-cols-[minmax(10rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start"
            >
              <label class="flex min-w-0 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 accent-app-action"
                  checked={selectedFieldPaths.includes(field.path)}
                  onchange={(event) =>
                    onToggleField(field.path, (event.currentTarget as HTMLInputElement).checked)}
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium">{field.label}</span>
                  <span class="block truncate text-xs text-muted-foreground">{field.path}</span>
                </span>
              </label>

              <span class="min-w-0">
                <span class="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Importado</span>
                {#if isFieldEditable(field)}
                  <textarea
                    class="block min-h-[4.5rem] w-full resize-y rounded-md border border-app-border bg-app-accent/10 px-2.5 py-2 text-sm text-app-fg focus:border-app-action focus:outline-none focus:ring-1 focus:ring-app-action"
                    value={textValue(field.path)}
                    disabled={!selectedFieldPaths.includes(field.path)}
                    oninput={(event) =>
                      onFieldValueChange(field.path, (event.currentTarget as HTMLTextAreaElement).value)}
                  ></textarea>
                  <span class="mt-1 block text-xs text-muted-foreground">
                    {suggestions[field.path]?.note ?? "Você pode editar antes de aplicar."}
                  </span>
                {:else}
                  <span class="block break-words rounded-md bg-app-accent/10 px-2.5 py-2 text-sm text-app-fg">
                    {formatMergeValue(displayedIncomingValue(field))}
                  </span>
                  {#if suggestions[field.path]?.note}
                    <span class="mt-1 block text-xs text-muted-foreground">
                      {suggestions[field.path]?.note}
                    </span>
                  {/if}
                {/if}
              </span>

              <span class="min-w-0">
                <span class="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Atual</span>
                <span class="block break-words rounded-md bg-app-surface-muted px-2.5 py-2 text-sm text-muted-foreground">
                  {formatMergeValue(field.currentValue)}
                </span>
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <div class="rounded-lg border border-dashed border-app-border p-6 text-center">
    <Check class="mx-auto h-5 w-5 text-app-accent" />
    <p class="mt-2 text-sm font-medium">Nenhum campo diferente</p>
    <p class="mt-1 text-sm text-muted-foreground">Você ainda pode revisar as fotos abaixo.</p>
  </div>
{/if}
