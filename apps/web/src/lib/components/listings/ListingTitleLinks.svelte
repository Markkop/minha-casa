<script lang="ts">
  import { truncateListingTitle } from "$lib/components/listings/listing-title-display";
  import { buildPropertyHref } from "$lib/property-details-url";
  import { cn } from "$lib/utils";

  let {
    listing,
    displayTitle: displayTitleProp,
    collectionId: _collectionId = null,
    class: className = "",
    titleClassName = "",
    maxTitleLength = 50,
    overlayOnMedia = false,
    wrapTitle = false,
    truncateTitle = true
  } = $props<{
    listing: { id: string; title: string; link?: string | null; strikethrough?: boolean };
    displayTitle?: string;
    collectionId?: string | null;
    class?: string;
    titleClassName?: string;
    maxTitleLength?: number;
    overlayOnMedia?: boolean;
    wrapTitle?: boolean;
    truncateTitle?: boolean;
  }>();

  const resolvedTitle = $derived(displayTitleProp ?? listing.title);
  const displayTitle = $derived(
    wrapTitle || !truncateTitle ? resolvedTitle : truncateListingTitle(resolvedTitle, maxTitleLength)
  );
  const detailsHref = $derived(buildPropertyHref(listing.id));
</script>

<span
  class={cn(
    "flex min-w-0 max-w-full gap-1",
    wrapTitle ? "items-start" : "flex-1 items-center",
    className
  )}
>
  <a
    href={detailsHref}
    title={`Ver detalhes: ${resolvedTitle}`}
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
