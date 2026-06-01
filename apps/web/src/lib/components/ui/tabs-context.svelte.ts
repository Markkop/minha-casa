import { createContext } from "svelte";

export interface TabsContextValue {
  readonly value: string;
  setValue: (next: string) => void;
}

export const [getTabsContext, setTabsContext] = createContext<TabsContextValue>();
