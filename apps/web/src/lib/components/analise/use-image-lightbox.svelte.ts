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

  function goPrev() {
    lightboxLocalIndex =
      lightboxLocalIndex === null ? null : Math.max(lightboxLocalIndex - 1, 0);
  }

  function goNext() {
    const thumbs = getThumbs();
    lightboxLocalIndex =
      lightboxLocalIndex === null ? null : Math.min(lightboxLocalIndex + 1, thumbs.length - 1);
  }

  $effect(() => {
    if (lightboxLocalIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      const thumbs = getThumbs();
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") {
        lightboxLocalIndex =
          lightboxLocalIndex === null ? null : Math.min(lightboxLocalIndex + 1, thumbs.length - 1);
      }
      if (e.key === "ArrowLeft") {
        lightboxLocalIndex =
          lightboxLocalIndex === null ? null : Math.max(lightboxLocalIndex - 1, 0);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return {
    get lightboxLocalIndex() {
      return lightboxLocalIndex;
    },
    close,
    open,
    goPrev,
    goNext,
    get current() {
      const index = lightboxLocalIndex;
      const thumbs = getThumbs();
      return index !== null ? thumbs[index] : null;
    },
    get canPrev() {
      return lightboxLocalIndex !== null && lightboxLocalIndex > 0;
    },
    get canNext() {
      const thumbs = getThumbs();
      return lightboxLocalIndex !== null && lightboxLocalIndex < thumbs.length - 1;
    }
  };
}
