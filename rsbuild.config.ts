import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

const apiUrl = process.env.API_URL || "http://localhost:5075";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/main.tsx",
    },
    alias: {
      "@": "./src",
    },
  },
  html: {
    template: "./index.html",
  },
  server: {
    port: 5173,
    proxy: {
      "/hubs": {
        target: apiUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
