import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");

function applyEnv(mode: string, dir: string) {
  const loaded = loadEnv(mode, dir, "");
  for (const [key, value] of Object.entries(loaded)) {
    if (value !== "" && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const mode = process.env.NODE_ENV === "production" ? "production" : "development";
applyEnv(mode, repoRoot);
applyEnv(mode, webRoot);

export default defineConfig({
  envDir: webRoot,
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: {
      "@minha-casa/db": path.join(repoRoot, "lib/db")
    }
  },
  server: {
    allowedHosts: ["host.docker.internal"],
    fs: {
      allow: [repoRoot]
    }
  }
});
