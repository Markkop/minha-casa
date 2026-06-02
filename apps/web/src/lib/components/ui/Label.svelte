<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    children,
    class: className = "",
    for: htmlFor
  } = $props<{
    children?: import("svelte").Snippet;
    class?: string;
    for?: string;
  }>();
</script>

<label
  data-slot="label"
  for={htmlFor}
  class={cn(
    "flex select-none items-center gap-2 text-sm leading-none font-medium group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
    className
  )}
>
  {@render children?.()}
</label>
