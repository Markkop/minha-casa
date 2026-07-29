<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { formatCurrency } from "$lib/financiamento/calculations";
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
  let inputValue = $state("0");

  $effect(() => {
    if (!isFocused) {
      inputValue = value.toString();
    }
  });

  function commit(raw: string) {
    const numericValue = parseInt(raw.replace(/\D/g, ""), 10) || 0;
    inputValue = numericValue.toString();
    if (numericValue !== value) {
      onchange?.(numericValue);
    }
  }

  function finish() {
    commit(inputValue);
    onfinish?.();
  }

  function handleFocus() {
    isFocused = true;
    inputValue = value.toString();
  }

  function handleBlur() {
    isFocused = false;
    finish();
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    inputValue = target.value.replace(/\D/g, "");
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
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }
</script>

<Input
  type="text"
  inputmode="numeric"
  value={isFocused ? inputValue : formatCurrency(value)}
  class={cn("font-mono", className)}
  onfocus={handleFocus}
  onblur={handleBlur}
  oninput={handleInput}
  onkeydown={handleKeydown}
/>
