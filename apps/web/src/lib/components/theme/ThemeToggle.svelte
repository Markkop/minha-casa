<script lang="ts">
  import { Moon, Sun } from "@lucide/svelte";
  import { onMount } from "svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { cn } from "$lib/utils";
  import { subscribeTheme, toggleTheme, type Theme } from "$lib/theme";

  let {
    class: className = ""
  }: {
    class?: string;
  } = $props();

  let theme = $state<Theme>("dark");
  const label = $derived(theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro");

  onMount(() => subscribeTheme((detail) => {
    theme = detail.theme;
  }));
</script>

<FloatingTooltip {label} side="bottom">
  <button
    type="button"
    aria-label={label}
    class={cn(
      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
      className
    )}
    onclick={() => toggleTheme()}
  >
    {#if theme === "dark"}
      <Sun aria-hidden="true" size={17} strokeWidth={1.8} />
    {:else}
      <Moon aria-hidden="true" size={17} strokeWidth={1.8} />
    {/if}
  </button>
</FloatingTooltip>
