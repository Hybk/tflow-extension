import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: "index.html", // Main popup HTML file
        background: "src/background.ts", // Path to the background script
      },
      output: {
        entryFileNames: "[name].bundle.js", // Name the output files
      },
    },
  },
});
