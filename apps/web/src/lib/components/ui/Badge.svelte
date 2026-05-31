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
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700"
  };
</script>

<span class={cn("inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium", tones[tone as Tone], className)}>
  {@render children?.()}
</span>
