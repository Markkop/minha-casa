<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    estrategia,
    variant = "full"
  }: {
    estrategia: "permuta" | "venda_posterior";
    variant?: "full" | "inline";
  } = $props();

  const config = {
    permuta: {
      label: "Permuta",
      fullClass: "bg-salmon/20 text-salmon border-salmon",
      inlineClass: "text-salmon",
      icon: "🔄"
    },
    venda_posterior: {
      label: "Venda Posterior",
      fullClass: "bg-green/20 text-green border-green",
      inlineClass: "text-green",
      icon: "⏱️"
    }
  } as const;

  const item = $derived(config[estrategia] ?? config.permuta);
</script>

{#if variant === "inline"}
  <span class={cn("text-xs font-medium", item.inlineClass)}>{item.label}</span>
{:else}
  <span
    class={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
      item.fullClass
    )}
  >
    <span>{item.icon}</span>
    {item.label}
  </span>
{/if}
