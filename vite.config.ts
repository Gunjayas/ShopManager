import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configures the browser bundle and forwards local API calls to Fastify during development.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
});