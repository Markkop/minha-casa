<script lang="ts">
  let { listingId, src, alt = "", onError }: {
    listingId: string;
    src: string;
    alt?: string;
    onError?: () => void;
  } = $props();
</script>

<img
  src={src}
  alt={alt}
  loading="lazy"
  class="h-full w-full object-cover object-center"
  data-listing-id={listingId}
  onerror={() => onError?.()}
/>
