<script lang="ts">
  import { onMount } from "svelte";
  import { Flag } from "@lucide/svelte";
  import {
    adminFeatureFlagMeta,
    readAdminFeatureFlags,
    writeAdminFeatureFlags,
    type AdminFeatureFlagName,
    type AdminFeatureFlags
  } from "$lib/admin/client";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";

  let flags = $state<AdminFeatureFlags>({
    visaoGeral: false,
    contatos: false,
    regioes: false,
    condominios: false,
    deepAnalysis: false
  });

  onMount(() => {
    flags = readAdminFeatureFlags(true);
  });

  function setFlag(key: AdminFeatureFlagName, value: boolean) {
    flags = { ...flags, [key]: value };
    writeAdminFeatureFlags(flags);
  }

  const navigationFlags = adminFeatureFlagMeta.filter((flag) => flag.group === "navigation");
  const analysisFlags = adminFeatureFlagMeta.filter((flag) => flag.group === "analysis");
</script>

<PageScaffold title="Feature flags" description="Controles locais para recursos administrativos neste navegador.">
  <div class="max-w-3xl space-y-4">
    <div class="flex items-start gap-3 rounded-md border border-app-border bg-app-surface p-4 text-sm text-app-muted">
      <Flag class="mt-0.5 h-5 w-5 shrink-0" />
      <p>As flags continuam locais em localStorage, como no frontend anterior. Persistencia em Phoenix fica como revisita.</p>
    </div>

    {@render FlagGroup({ title: "Navegacao", flags: navigationFlags, values: flags, onToggle: setFlag })}
    {@render FlagGroup({ title: "Analise", flags: analysisFlags, values: flags, onToggle: setFlag })}
  </div>
</PageScaffold>

{#snippet FlagGroup({
  title,
  flags,
  values,
  onToggle
}: {
  title: string;
  flags: typeof adminFeatureFlagMeta;
  values: AdminFeatureFlags;
  onToggle: (key: AdminFeatureFlagName, checked: boolean) => void;
})}
  <section class="rounded-md border border-app-border bg-app-surface">
    <div class="border-b border-app-border px-4 py-3 text-xs font-semibold uppercase text-app-muted">{title}</div>
    <div class="divide-y divide-app-border">
      {#each flags as flag}
        <label class="flex cursor-pointer items-start justify-between gap-4 p-4">
          <span>
            <span class="block text-sm font-medium">{flag.label}</span>
            <span class="mt-1 block text-sm text-app-muted">{flag.description}</span>
            {#if flag.navHref}
              <span class="mt-1 block font-mono text-xs text-app-muted">{flag.navHref}</span>
            {/if}
          </span>
          <input
            class="mt-1 h-5 w-5"
            type="checkbox"
            checked={values[flag.key] === true}
            onchange={(event) => onToggle(flag.key, (event.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      {/each}
    </div>
  </section>
{/snippet}
