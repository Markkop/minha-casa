/** Fits 2 icon buttons (edit + delete) */
export const WORKSPACE_TABLE_ACTIONS_WIDTH = "96px";

/** Fits 3 icon buttons (e.g. open + edit + delete) */
export const WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE = "140px";

export const tableCellClass = "px-3 py-1.5 align-middle min-w-0";

export const tableHeadClass =
  "px-3 py-2 text-left align-middle text-xs font-medium uppercase tracking-wide text-app-muted";

export type WorkspaceTableColumn = {
  id: string;
  header: string;
  /** Column width for table-layout: fixed (e.g. "24%" or "104px") */
  width: string;
};
