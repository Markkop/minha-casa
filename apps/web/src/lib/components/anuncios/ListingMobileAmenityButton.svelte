<script lang="ts">
  import type { ListingMobileAmenityItem } from "$lib/components/anuncios/listing-mobile-amenities";
  import { LISTING_MOBILE_ICON_CLASS } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    amenity,
    strikethrough = false,
    class: className = ""
  }: {
    amenity: ListingMobileAmenityItem;
    strikethrough?: boolean;
    class?: string;
  } = $props();
</script>

<span
  class={cn(
    "inline-flex items-center gap-1 leading-none",
    strikethrough && "opacity-50",
    className
  )}
>
  <amenity.Icon class={cn(LISTING_MOBILE_ICON_CLASS, amenity.iconClass)} />
  <span class="text-xs text-app-fg">{amenity.label}</span>
</span>
