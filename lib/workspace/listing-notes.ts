export function linesToList(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean)
}

export function listToLines(value: string[] | undefined) {
  return (value ?? []).join("\n")
}
