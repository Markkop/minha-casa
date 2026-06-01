export function calculateSliderRange(
  base: number,
  isCurrency = false
): { min: number; max: number; step: number } {
  if (isCurrency) {
    return {
      min: Math.round(base * 0.1),
      max: Math.round(base * 2.0),
      step: 10000
    };
  }
  return {
    min: base * 0.1,
    max: base * 2.0,
    step: Math.max(1, base * 0.01)
  };
}
