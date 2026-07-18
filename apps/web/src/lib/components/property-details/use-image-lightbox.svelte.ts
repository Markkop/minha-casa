export interface LightboxThumb {
  index: number;
  url: string;
}

export function useImageLightbox(getThumbs: () => LightboxThumb[]) {
  let lightboxLocalIndex = $state<number | null>(null);

  function close() {
    lightboxLocalIndex = null;
  }

  function open(localIndex: number) {
    const thumbs = getThumbs();
    if (localIndex >= 0 && localIndex < thumbs.length) {
      lightboxLocalIndex = localIndex;
    }
  }

  return {
    get lightboxLocalIndex() {
      return lightboxLocalIndex;
    },
    set lightboxLocalIndex(value: number | null) {
      lightboxLocalIndex = value;
    },
    close,
    open,
    get urls() {
      return getThumbs().map((thumb) => thumb.url);
    },
    get current() {
      const index = lightboxLocalIndex;
      const thumbs = getThumbs();
      return index !== null ? thumbs[index] : null;
    }
  };
}
