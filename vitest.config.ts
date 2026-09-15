import { defineConfig } from "vitest/config";
import path from "node:path";

// Les suites d'integration / E2E lisent les cles Supabase depuis .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Absent : les suites concernees s'ignorent d'elles-memes.
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
