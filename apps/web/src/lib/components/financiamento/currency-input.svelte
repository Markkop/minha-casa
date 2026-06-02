<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import { formatCurrency } from "$lib/financiamento/calculations";
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
  let inputValue = $state("0");

  $effect(() => {
    if (!isFocused) {
      inputValue = value.toString();
    }
  });

  function commit(raw: string) {
    const numericValue = parseInt(raw.replace(/\D/g, ""), 10) || 0;
    onchange?.(numericValue);
    inputValue = numericValue.toString();
  }

  function handleFocus() {
    isFocused = true;
    inputValue = value.toString();
  }

  function handleBlur() {
    isFocused = false;
    commit(inputValue);
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target.value.replace(/\D/g, "");
    inputValue = newValue;
    const numericValue = parseInt(newValue, 10) || 0;
    onchange?.(numericValue);
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
