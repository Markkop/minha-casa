<script lang="ts">
  import { cn } from "$lib/utils";

  type Tone = "default" | "muted" | "success" | "warning" | "danger";
  let {
    children,
    class: className = "",
    tone = "default"
  } = $props<{
    children?: import("svelte").Snippet;
    class?: string;
    tone?: Tone;
  }>();

  const tones: Record<Tone, string> = {
    default: "border-app-border bg-app-surface text-app-fg",
    muted: "border-app-border bg-app-surface-muted text-app-muted",
    success: "border-emerald-300/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-300/40 bg-amber-500/12 text-amber-800 dark:text-amber-200",
    danger: "border-rose-300/40 bg-rose-500/12 text-rose-700 dark:text-rose-300"
  };
</script>

<span class={cn("inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium", tones[tone as Tone], className)}>
  {@render children?.()}
</span>
