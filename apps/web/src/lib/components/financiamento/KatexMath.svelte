<script lang="ts">
  import katex from "katex";
  import "katex/dist/katex.min.css";
  import { cn } from "$lib/utils";

  let {
    math,
    displayMode = false,
    class: className = ""
  }: {
    math: string;
    displayMode?: boolean;
    class?: string;
  } = $props();

  const html = $derived(
    katex.renderToString(math, {
      throwOnError: false,
      displayMode
    })
  );
</script>

<span
  class={cn(displayMode ? "katex-display block overflow-x-auto" : "katex", className)}
  aria-hidden="true"
>
  {@html html}
</span>
