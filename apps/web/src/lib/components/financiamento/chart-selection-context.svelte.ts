import { createContext } from "svelte";
import {
  isSameChartSelection,
  toggleChartSelection,
  type ChartPointSelection
} from "$lib/components/financiamento/chart-selection";

export type ChartSelectionContextValue = {
  readonly selection: ChartPointSelection | null;
  readonly breakdownDismissed: boolean;
  toggleSelection: (next: ChartPointSelection) => void;
  clearSelection: () => void;
  dismissBreakdown: () => void;
};

export const [getChartSelectionContext, setChartSelectionContext] =
  createContext<ChartSelectionContextValue>();

export function createChartSelectionState() {
  let selection = $state<ChartPointSelection | null>(null);
  let breakdownDismissed = $state(false);

  return {
    get selection() {
      return selection;
    },
    get breakdownDismissed() {
      return breakdownDismissed;
    },
    toggleSelection(next: ChartPointSelection) {
      const prev = selection;
      const nextSelection = toggleChartSelection(selection, next);
      if (!isSameChartSelection(prev, nextSelection)) {
        breakdownDismissed = false;
      }
      selection = nextSelection;
    },
    clearSelection() {
      selection = null;
      breakdownDismissed = false;
    },
    dismissBreakdown() {
      breakdownDismissed = true;
    }
  };
}
