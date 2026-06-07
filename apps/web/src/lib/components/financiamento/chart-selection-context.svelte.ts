import { createContext } from "svelte";
import {
  toggleChartSelection,
  type ChartPointSelection
} from "$lib/components/financiamento/chart-selection";

export type ChartSelectionContextValue = {
  readonly selection: ChartPointSelection | null;
  toggleSelection: (next: ChartPointSelection) => void;
  clearSelection: () => void;
};

export const [getChartSelectionContext, setChartSelectionContext] =
  createContext<ChartSelectionContextValue>();

export function createChartSelectionState() {
  let selection = $state<ChartPointSelection | null>(null);

  return {
    get selection() {
      return selection;
    },
    toggleSelection(next: ChartPointSelection) {
      selection = toggleChartSelection(selection, next);
    },
    clearSelection() {
      selection = null;
    }
  };
}
