<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    class: className = "",
    value = $bindable(""),
    type = "text",
    placeholder,
    disabled = false,
    required = false,
    name,
    id,
    min,
    max,
    step,
    inputmode,
    ariaLabel,
    onchange,
    oninput,
    onkeydown,
    onfocus,
    onblur
  } = $props<{
    class?: string;
    value?: string | number | null;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    id?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    inputmode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
    ariaLabel?: string;
    onchange?: (event: Event & { currentTarget: HTMLInputElement }) => void;
    oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
    onkeydown?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
    onfocus?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
    onblur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
  }>();
</script>

<input
  {id}
  {name}
  {type}
  {placeholder}
  {disabled}
  {required}
  {min}
  {max}
  {step}
  {inputmode}
  aria-label={ariaLabel}
  bind:value
  class={cn(
    "flex h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-fg shadow-sm transition placeholder:text-app-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action disabled:cursor-not-allowed disabled:opacity-60",
    className
  )}
  {onchange}
  {oninput}
  {onkeydown}
  {onfocus}
  {onblur}
/>
