<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import { setTabsContext } from "$lib/components/ui/tabs-context.svelte";

  let {
    value = $bindable(""),
    class: className = "",
    children
  }: {
    value?: string;
    class?: string;
    children?: Snippet;
  } = $props();

  setTabsContext({
    get value() {
      return value;
    },
    setValue(next: string) {
      value = next;
    }
  });
</script>

<div data-slot="tabs" class={cn("flex flex-col gap-2", className)}>
  {@render children?.()}
</div>
