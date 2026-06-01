export function useEscapeToCancel(enabled: () => boolean, onCancel: () => void) {
  $effect(() => {
    if (!enabled()) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
}
