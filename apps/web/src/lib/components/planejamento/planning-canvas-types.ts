export type CanvasTrack = {
  id: string;
  name: string;
};

export type CanvasEvent = {
  id: string;
  trackId: string;
  name: string;
  type: string;
  startMonth: number;
  endMonth: number;
  resizable: boolean;
  invalid?: boolean;
  breakdown: Array<{ label: string; value: string }>;
};
