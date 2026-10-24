import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    port: 3002,
  },
  plugins: [tanstackStart(), viteReact()],
});
