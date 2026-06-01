import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        google: "readonly"
      }
    }
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig
      }
    },
    rules: {
      // Svelte $effect() often lists dependencies as bare expressions
      "@typescript-eslint/no-unused-expressions": "off"
    }
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "off",
      // Migration: maps/Three/Leaflet need direct DOM; SvelteKit links work without resolve() on static paths
      "svelte/no-dom-manipulating": "off",
      "svelte/no-navigation-without-resolve": "off",
      "svelte/prefer-svelte-reactivity": "off",
      "svelte/prefer-writable-derived": "off",
      "svelte/require-each-key": "off",
      "svelte/no-useless-mustaches": "off",
      "svelte/no-at-html-tags": "off",
      "svelte/no-unused-svelte-ignore": "off"
    }
  },
  {
    ignores: [".svelte-kit/**", "build/**", "node_modules/**", "**/*.d.ts"]
  }
);
