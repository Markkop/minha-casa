<script lang="ts">
  let {
    class: className = "",
    decorative = true,
    label = "Prisma"
  } = $props<{
    class?: string;
    decorative?: boolean;
    label?: string;
  }>();
</script>

<svg
  class={className}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={decorative ? undefined : "img"}
  aria-label={decorative ? undefined : label}
  aria-hidden={decorative ? "true" : undefined}
  focusable="false"
>
  <path
    d="M12 3.2 6.5 11.6a.7.7 0 0 0-.05.78L12 15.1l5.55-2.72a.7.7 0 0 0-.05-.78Z"
  />
  <path
    d="M12 20.8 6.5 12.4a.7.7 0 0 1-.05-.78L12 8.9l5.55 2.72a.7.7 0 0 1-.05.78Z"
  />
  <path d="M12 3.2v17.6" />
</svg>
