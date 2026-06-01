import { getContext, setContext } from "svelte";

export interface TabsContextValue {
  readonly value: string;
  setValue: (next: string) => void;
}

const TABS_CONTEXT_KEY = Symbol("ui-tabs");

export function setTabsContext(value: TabsContextValue): void {
  setContext(TABS_CONTEXT_KEY, value);
}

export function getTabsContext(): TabsContextValue {
  const ctx = getContext<TabsContextValue>(TABS_CONTEXT_KEY);
  if (!ctx) {
    throw new Error("TabsList, TabsTrigger, and TabsContent must be used within Tabs");
  }
  return ctx;
}
