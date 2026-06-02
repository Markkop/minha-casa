<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { cn } from "$lib/utils";

  let {
    class: className = "",
    value = $bindable(""),
    placeholder,
    disabled = false,
    oninput
  } = $props<{
    class?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
  }>();
</script>

<Input
  class={cn("h-8 w-full min-w-0 text-sm", className)}
  bind:value
  {placeholder}
  {disabled}
  {oninput}
/>
