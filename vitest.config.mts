import path from "node:path";
import { defineConfig } from "vitest/config";

// .env.local supplies DATABASE_URL for the optional database integration tests (skipped without it).
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no local env file */
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside the Next server bundle; stub it for unit tests.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
