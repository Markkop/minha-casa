<script lang="ts">
  import { RotateCcw, X } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CardContent from "$lib/components/ui/CardContent.svelte";
  import CardHeader from "$lib/components/ui/CardHeader.svelte";
  import CardTitle from "$lib/components/ui/CardTitle.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import { getSettingsContext } from "$lib/financiamento/settings-context.svelte";
  import {
    DEFAULT_SETTINGS,
    type SimulatorSettings,
    type SliderRange
  } from "$lib/financiamento/settings";
  import { cn } from "$lib/utils";

  let {
    isOpen = false,
    onClose
  }: {
    isOpen?: boolean;
    onClose: () => void;
  } = $props();

  const settingsContext = getSettingsContext();
  let localSettings = $state<SimulatorSettings>(settingsContext.settings);

  $effect(() => {
    if (isOpen) {
      localSettings = structuredClone(settingsContext.settings);
    }
  });

  function handleSave() {
    settingsContext.updateSettings(localSettings);
    onClose();
  }

  function handleReset() {
    localSettings = structuredClone(DEFAULT_SETTINGS);
    settingsContext.resetSettings();
  }

  function handleCancel() {
    localSettings = structuredClone(settingsContext.settings);
    onClose();
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      handleCancel();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-app-fg/80 py-8"
    onclick={handleCancel}
    role="presentation"
  >
    <div
      class="mx-4 w-full max-w-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações do simulador"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleDialogKeydown}
    >
      <Card class="border-app-border bg-app-surface">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle class="flex items-center gap-2 text-xl">⚙️ Configurações do Simulador</CardTitle>
          <button
            type="button"
            class="rounded p-2 transition-colors hover:bg-app-surface-muted"
            onclick={handleCancel}
            aria-label="Fechar"
          >
            <X class="size-5 text-app-muted" />
          </button>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="space-y-2">
            <Label class="text-sm font-semibold text-app-accent">CET - Custo Efetivo Total</Label>
            <p class="mb-2 text-xs text-app-subtle">
              Custo adicional estimado (seguros, taxas) a ser adicionado ao cálculo do CET.
            </p>
            <div class="flex items-center gap-2">
              <Input
                type="number"
                class="w-24 font-mono"
                value={localSettings.cetAdditionalCost * 100}
                oninput={(e) => {
                  const v = parseFloat(e.currentTarget.value) || 0;
                  localSettings = { ...localSettings, cetAdditionalCost: v / 100 };
                }}
                step={0.1}
                min={0}
                max={10}
              />
              <span class="text-sm text-app-subtle">% a.a.</span>
            </div>
          </div>

          <div class="space-y-4">
            <Label class="text-sm font-semibold text-app-accent">Limites dos Sliders</Label>
            <p class="mb-2 text-xs text-app-subtle">
              Configure os valores mínimos, máximos e incrementos de cada slider.
            </p>

            {#each [
              { key: "taxaAnual" as const, label: "Taxa de Juros Anual", isPercent: true },
              { key: "trMensal" as const, label: "TR Mensal", isPercent: true },
              { key: "aporteExtra" as const, label: "Aporte Extra Mensal", isCurrency: true },
              { key: "rendaMensal" as const, label: "Renda Mensal", isCurrency: true }
            ] as row (row.key)}
              {@const range = localSettings.sliders[row.key]}
              <div class="space-y-2">
                <Label class="text-sm text-app-muted">{row.label}</Label>
                <div class="flex flex-wrap items-center gap-2">
                  {#each [
                    { label: "Min:", field: "min" as const },
                    { label: "Max:", field: "max" as const },
                    { label: "Step:", field: "step" as const, className: "w-20", step: 0.01 }
                  ] as part (part.field)}
                    <div class="flex items-center gap-1">
                      <span class="w-8 text-xs text-app-subtle">{part.label}</span>
                      <Input
                        type="number"
                        class={cn("w-24 font-mono", part.className)}
                        value={range[part.field]}
                        step={part.step ?? range.step}
                        oninput={(e) => {
                          const v = parseFloat(e.currentTarget.value) || 0;
                          const next: SliderRange = { ...range, [part.field]: v };
                          localSettings = {
                            ...localSettings,
                            sliders: { ...localSettings.sliders, [row.key]: next }
                          };
                        }}
                      />
                      {#if row.isPercent}
                        <span class="text-xs text-app-subtle">%</span>
                      {:else if row.isCurrency}
                        <span class="text-xs text-app-subtle">R$</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>

          <div class="flex items-center justify-between border-t border-app-border pt-4">
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 text-sm text-salmon transition-colors hover:text-salmon/80"
              onclick={handleReset}
            >
              <RotateCcw class="size-4" />
              Restaurar Padrões
            </button>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md border border-app-border px-4 py-2 text-sm text-app-muted transition-colors hover:text-app-fg"
                onclick={handleCancel}
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-md bg-app-action px-4 py-2 text-sm font-semibold text-app-action-foreground transition-colors hover:bg-app-action-hover"
                onclick={handleSave}
              >
                Salvar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
{/if}
