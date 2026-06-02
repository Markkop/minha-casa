export function useEscapeToCancel(enabled: () => boolean, onCancel: () => void) {
  $effect(() => {
    const isEnabled = enabled();
    const cancel = onCancel;
    if (!isEnabled) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
}
