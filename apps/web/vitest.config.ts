import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.join(webRoot, "src/lib")
    }
  },
  test: {
    include: ["src/**/*.test.ts"]
  }
});
