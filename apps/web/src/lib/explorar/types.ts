import type { Portal } from "$lib/workspace/client";
import type { ShortListing } from "$lib/workspace/client";
import type { MATRIX_AXES, MATRIX_METRICS } from "./constants";

export type MatrixAxis = (typeof MATRIX_AXES)[number]["value"];
export type MatrixMetric = (typeof MATRIX_METRICS)[number]["value"];
export type MatrixCell = { row: string; col: string; value: number | null; count: number; listings: ShortListing[] };
export type MatrixData = { rows: string[]; cols: string[]; cells: MatrixCell[] };
export type StreamStatus = "idle" | "connecting" | "connected" | "closed" | "fallback";
export type PreviewUrl = { portal: Portal; url: string };
export type BairroStat = { neighborhood: string; count: number; medianM2: number | null; minPrice: number | null };
export type PortalStat = { portal: Portal; count: number; medianM2: number | null };
