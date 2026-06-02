export type ScenarioFilterOption<T extends string | number = string | number> = {
  value: T;
  label: string;
  hint?: string;
};
