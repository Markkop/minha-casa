export interface ReportPreviewSegment {
  text: string;
  href?: string;
}

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function createReportPreviewSegments(value: string): ReportPreviewSegment[] {
  const text = value.replaceAll("**", "");
  const segments: ReportPreviewSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: match[0], href: match[0] });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length > 0 ? segments : [{ text }];
}
