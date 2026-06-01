<script lang="ts" module>
  export function truncateListingTitle(title: string, maxLength = 50) {
    if (title.length <= maxLength) return title;
    return `${title.slice(0, maxLength)}...`;
  }
</script>

<script lang="ts">

  import { ExternalLink } from "@lucide/svelte";
  import { buildListingAnaliseHref } from "$lib/listing-analise-url";
  import { cn } from "$lib/utils";
  import {
    LISTING_MOBILE_ICON_BTN_CLASS,
    LISTING_MOBILE_ICON_CLASS
  } from "$lib/components/anuncios/listings-table-shared";

  let {
    listing,
    displayTitle: displayTitleProp,
    collectionId = null,
    class: className = "",
    titleClassName = "",
    maxTitleLength = 50,
    showExternalIcon = true,
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
    showExternalIcon?: boolean;
    overlayOnMedia?: boolean;
    wrapTitle?: boolean;
    truncateTitle?: boolean;
  }>();

  const resolvedTitle = $derived(displayTitleProp ?? listing.titulo);
  const displayTitle = $derived(
    wrapTitle || !truncateTitle ? resolvedTitle : truncateListingTitle(resolvedTitle, maxTitleLength)
  );
  const analiseHref = $derived(buildListingAnaliseHref(listing.id, collectionId));
  const hasExternalLink = $derived(
    showExternalIcon && typeof listing.link === "string" && listing.link.trim() !== ""
  );
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
    title={`Ver análise: ${resolvedTitle}`}
  >
    {displayTitle}
  </a>
  {#if hasExternalLink}
    <a
      href={listing.link!}
      target="_blank"
      rel="noopener noreferrer"
      class={cn(
        overlayOnMedia
          ? cn(LISTING_MOBILE_ICON_BTN_CLASS, "text-white/80 hover:text-white")
          : "shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-app-accent",
        !overlayOnMedia && listing.strikethrough && "opacity-50",
        overlayOnMedia && listing.strikethrough && "opacity-50"
      )}
      aria-label="Abrir anúncio original"
      onclick={(event) => event.stopPropagation()}
    >
      <ExternalLink class={overlayOnMedia ? LISTING_MOBILE_ICON_CLASS : "h-3.5 w-3.5"} />
    </a>
  {/if}
</span>
