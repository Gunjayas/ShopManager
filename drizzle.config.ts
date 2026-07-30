import { defineConfig } from "drizzle-kit";

// Drizzle Kit uses the SQLite dialect while application code uses Node's built-in node:sqlite driver.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./shop.db",
  },
  strict: true,
  verbose: true,
});