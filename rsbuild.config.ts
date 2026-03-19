import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

const apiUrl = process.env.API_URL || "http://localhost:5075";
const { publicVars } = loadEnv({ prefixes: ["VITE_"] });

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/main.tsx",
    },
    alias: {
      "@": "./src",
    },
    define: publicVars,
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
