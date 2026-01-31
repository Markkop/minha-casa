import "@testing-library/dom";
import "@testing-library/jest-dom/vitest";

// Mock scrollIntoView for Radix UI Select components
Element.prototype.scrollIntoView = () => {};
