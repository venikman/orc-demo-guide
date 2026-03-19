import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));
const apiUrl = process.env.API_URL || "http://localhost:5075";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  server: {
    proxy: {
      "/api": {
        target: apiUrl,
        changeOrigin: true,
      },
      "/hubs": {
        target: apiUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
