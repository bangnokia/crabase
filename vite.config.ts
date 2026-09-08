import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../server/public", emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/live": { target: "ws://127.0.0.1:8788", ws: true },
    },
  },
});
