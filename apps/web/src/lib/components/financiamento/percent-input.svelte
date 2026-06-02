<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { cn } from "$lib/utils";

  let {
    value,
    class: className = "",
    onchange
  }: {
    value: number;
    class?: string;
    onchange?: (value: number) => void;
  } = $props();

  let isFocused = $state(false);
  let inputValue = $state("0.00");

  $effect(() => {
    if (!isFocused) {
      inputValue = (value * 100).toFixed(2);
    }
  });

  function parsePercent(raw: string): number {
    const cleanValue = raw.replace(/[^\d.,]/g, "").replace(",", ".");
    return (parseFloat(cleanValue) || 0) / 100;
  }

  function commit(raw: string) {
    const numericValue = parseFloat(raw.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const next = numericValue / 100;
    onchange?.(next);
    inputValue = numericValue.toFixed(2);
  }

  function handleFocus() {
    isFocused = true;
    inputValue = (value * 100).toFixed(2);
  }

  function handleBlur() {
    isFocused = false;
    commit(inputValue);
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target.value.replace(/[^\d.,]/g, "");
    inputValue = newValue;
    const next = parsePercent(newValue);
    onchange?.(next);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (
      event.key === "Backspace" ||
      event.key === "Delete" ||
      event.key === "Tab" ||
      event.key === "Escape" ||
      event.key === "Enter" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && ["a", "c", "v", "x"].includes(event.key.toLowerCase())) {
      return;
    }
    if (!/^[\d.,]$/.test(event.key)) {
      event.preventDefault();
    }
  }
</script>

<Input
  type="text"
  inputmode="decimal"
  value={isFocused ? inputValue : `${(value * 100).toFixed(2)}%`}
  class={cn("font-mono", className)}
  onfocus={handleFocus}
  onblur={handleBlur}
  oninput={handleInput}
  onkeydown={handleKeydown}
/>
