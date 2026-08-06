/** Heuristic URL check used when pasting clipboard text into the add flow. */
export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /^https?:\/\//i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
}
