import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works locally, from file://, and when served
// from a sub-path like GitHub Pages (https://user.github.io/flipit/).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
