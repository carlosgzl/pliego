import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5175,
    // The books live behind the Alexandria API on this machine. Proxying in
    // development keeps the browser on one origin, so a misconfigured CORS
    // header can never be the reason writing stopped working locally.
    proxy: {
      "/writing": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    // A writing app is opened and left open: one bundle, no route splitting.
    // The whole thing is well under what a phone downloads for a news page.
    chunkSizeWarningLimit: 700,
  },
});
