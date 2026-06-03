<script lang="ts">
  import { truncateListingTitle } from "$lib/components/anuncios/listing-title-display";
  import { buildListingAnaliseHref } from "$lib/listing-analise-url";
  import { cn } from "$lib/utils";

  let {
    listing,
    displayTitle: displayTitleProp,
    collectionId = null,
    class: className = "",
    titleClassName = "",
    maxTitleLength = 50,
    overlayOnMedia = false,
    wrapTitle = false,
    truncateTitle = true
  } = $props<{
    listing: { id: string; titulo: string; link?: string | null; strikethrough?: boolean };
    displayTitle?: string;
    collectionId?: string | null;
    class?: string;
    titleClassName?: string;
    maxTitleLength?: number;
    overlayOnMedia?: boolean;
    wrapTitle?: boolean;
    truncateTitle?: boolean;
  }>();

  const resolvedTitle = $derived(displayTitleProp ?? listing.titulo);
  const displayTitle = $derived(
    wrapTitle || !truncateTitle ? resolvedTitle : truncateListingTitle(resolvedTitle, maxTitleLength)
  );
  const analiseHref = $derived(buildListingAnaliseHref(listing.id, collectionId));
</script>

<span
  class={cn(
    "flex min-w-0 max-w-full gap-1",
    wrapTitle ? "items-start" : "flex-1 items-center",
    className
  )}
>
  <a
    href={analiseHref}
    title={`Ver análise: ${resolvedTitle}`}
    class={cn(
      "font-medium transition-colors",
      wrapTitle
        ? "block min-w-0 whitespace-normal break-words leading-tight"
        : !truncateTitle
          ? "min-w-0 whitespace-nowrap leading-snug"
          : "min-w-0 shrink truncate leading-snug",
      overlayOnMedia ? "text-white hover:text-white/90" : "text-app-fg hover:text-app-accent",
      listing.strikethrough && "line-through opacity-50",
      titleClassName
    )}
  >
    {displayTitle}
  </a>
</span>
