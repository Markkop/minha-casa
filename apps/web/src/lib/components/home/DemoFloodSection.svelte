<script lang="ts">
  import DemoFloodCanvas from "$lib/components/home/DemoFloodCanvas.svelte";
  import { floodSceneColors } from "$lib/theme/colors";
  import { cn } from "$lib/utils";

  interface Projection {
    id: string;
    year: string;
    waterLevel: number;
    ruaFlooded: boolean;
    calcadaFlooded: boolean;
    casaFlooded: boolean;
  }

  const DEMO_PROJECTIONS: Projection[] = [
    {
      id: "today",
      year: "Hoje",
      waterLevel: 1.9,
      ruaFlooded: false,
      calcadaFlooded: false,
      casaFlooded: false
    },
    {
      id: "2030",
      year: "2030",
      waterLevel: 2.1,
      ruaFlooded: true,
      calcadaFlooded: false,
      casaFlooded: false
    },
    {
      id: "2040",
      year: "2040",
      waterLevel: 2.5,
      ruaFlooded: true,
      calcadaFlooded: true,
      casaFlooded: false
    },
    {
      id: "2050",
      year: "2050",
      waterLevel: 3.0,
      ruaFlooded: true,
      calcadaFlooded: true,
      casaFlooded: true
    }
  ];

  let activeProjectionId = $state("today");

  const activeProjection = $derived(
    DEMO_PROJECTIONS.find((p) => p.id === activeProjectionId) ?? DEMO_PROJECTIONS[0]
  );
</script>

<section class="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
  <div
    class="flex flex-col justify-between gap-4 border-b border-app-border pb-4 md:flex-row md:items-center"
  >
    <div>
      <h2 class="flex items-center gap-2 text-2xl font-bold text-app-fg">
        <span>🌊</span>
        <span>Visualizador de Alagamento</span>
        <span
          class="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
        >
          <span>🚀</span>
          Em Breve
        </span>
      </h2>
      <p class="text-sm text-app-muted">
        Visualize projeções de alagamento em 3D baseadas em dados climáticos.
      </p>
    </div>
  </div>

  <div class="overflow-hidden rounded-xl border border-app-border bg-app-surface">
    <div class="flex flex-col md:flex-row">
      <div class="relative h-[200px] w-full md:h-[280px] md:flex-1">
        <DemoFloodCanvas waterLevel={activeProjection.waterLevel} />

        <div class="absolute bottom-3 left-3 flex gap-2 text-[10px]">
          <div class="flex items-center gap-1 rounded bg-app-fg/60 px-2 py-1">
            <div
              class="h-2 w-2 rounded-sm"
              style:background-color={floodSceneColors.street}
            ></div>
            <span class="text-app-fg">Rua</span>
          </div>
          <div class="flex items-center gap-1 rounded bg-app-fg/60 px-2 py-1">
            <div
              class="h-2 w-2 rounded-sm"
              style:background-color={floodSceneColors.sidewalk}
            ></div>
            <span class="text-app-fg">Calçada</span>
          </div>
          <div class="flex items-center gap-1 rounded bg-app-fg/60 px-2 py-1">
            <div
              class="h-2 w-2 rounded-sm"
              style:background-color={floodSceneColors.houseGround}
            ></div>
            <span class="text-app-fg">Casa</span>
          </div>
        </div>
      </div>

      <div
        class="flex w-full items-center justify-center gap-3 border-t border-app-border bg-app-bg py-3 md:w-20 md:flex-col md:justify-start md:gap-2 md:border-l md:border-t-0 md:py-4"
      >
        <span class="hidden text-center text-[10px] text-app-muted md:mb-2 md:block">Projeções</span>
        {#each DEMO_PROJECTIONS as proj (proj.id)}
          {@const isActive = proj.id === activeProjectionId}
          {@const hasFlood = proj.ruaFlooded || proj.calcadaFlooded || proj.casaFlooded}
          {@const isCritical = proj.casaFlooded}
          <button
            type="button"
            title={proj.year}
            onclick={() => (activeProjectionId = proj.id)}
            class={cn(
              "flex h-12 w-12 items-center justify-center rounded-md border-2 text-xs font-bold transition-all duration-200",
              isActive && !hasFlood && "scale-110 border-app-action bg-app-action text-app-action-foreground",
              isActive && hasFlood && !isCritical && "scale-110 border-amber-500 bg-amber-50 text-amber-800",
              isActive && isCritical && "scale-110 border-red-500 bg-red-50 text-red-700",
              !isActive &&
                "border-app-border bg-app-surface text-app-muted hover:scale-105 hover:border-app-border-strong"
            )}
          >
            {proj.year}
          </button>
        {/each}
      </div>
    </div>
  </div>
</section>
