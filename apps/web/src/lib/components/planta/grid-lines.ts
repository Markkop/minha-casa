export type GridLineSpec = {
  id: string;
  points: number[];
  strong: boolean;
};

export type BuildGridLinesInput = {
  visible: boolean;
  size: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Build viewport grid lines using integer cell indices to avoid float drift duplicates. */
export function buildGridLines(input: BuildGridLinesInput): GridLineSpec[] {
  const { visible, size, left, top, right, bottom } = input;
  if (!visible || !Number.isFinite(size) || size <= 0) return [];

  const minColumn = Math.floor(left / size);
  const maxColumn = Math.ceil(right / size);
  const minRow = Math.floor(top / size);
  const maxRow = Math.ceil(bottom / size);
  const lines: GridLineSpec[] = [];

  for (let column = minColumn; column <= maxColumn; column++) {
    const x = column * size;
    lines.push({
      id: `v-${column}`,
      points: [x, top, x, bottom],
      strong: column === 0
    });
  }

  for (let row = minRow; row <= maxRow; row++) {
    const y = row * size;
    lines.push({
      id: `h-${row}`,
      points: [left, y, right, y],
      strong: row === 0
    });
  }

  return lines;
}
