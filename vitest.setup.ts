import "@testing-library/dom";
import "@testing-library/jest-dom/vitest";

// Mock scrollIntoView for Radix UI Select components
Element.prototype.scrollIntoView = () => {};

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
