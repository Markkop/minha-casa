<script lang="ts">
  import type { Component } from "svelte";

  let {
    icon: Icon,
    title
  } = $props<{
    icon: Component<{ class?: string }>;
    title: string;
  }>();
</script>

<h2 class="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-app-fg">
  <Icon class="h-5 w-5 text-app-accent" />
  <span>{title}</span>
</h2>
