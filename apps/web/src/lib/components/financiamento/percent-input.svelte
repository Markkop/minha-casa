<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { cn } from "$lib/utils";

  let {
    value,
    class: className = "",
    onchange,
    onfinish
  }: {
    value: number;
    class?: string;
    onchange?: (value: number) => void;
    /** Called after the value is committed (blur or Enter). */
    onfinish?: () => void;
  } = $props();

  let isFocused = $state(false);
  let inputValue = $state("0.00");

  $effect(() => {
    if (!isFocused) {
      inputValue = (value * 100).toFixed(2);
    }
  });

  function commit(raw: string) {
    const numericValue = parseFloat(raw.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const next = numericValue / 100;
    inputValue = numericValue.toFixed(2);
    if (next !== value) {
      onchange?.(next);
    }
  }

  function finish() {
    commit(inputValue);
    onfinish?.();
  }

  function handleFocus() {
    isFocused = true;
    inputValue = (value * 100).toFixed(2);
  }

  function handleBlur() {
    isFocused = false;
    finish();
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    inputValue = target.value.replace(/[^\d.,]/g, "");
  }

  function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (
      event.key === "Backspace" ||
      event.key === "Delete" ||
      event.key === "Tab" ||
      event.key === "Escape" ||
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
