import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import pkg from "./package.json"

const PREBUNDLE_EXCLUDE = new Set(["tailwindcss-animate"])
const prebundle = [
  "react/jsx-runtime",
  "react-dom/client",
  ...Object.keys((pkg as { dependencies?: Record<string, string> }).dependencies || {}).filter(
    (d) => !PREBUNDLE_EXCLUDE.has(d)
  ),
]

const host = process.env.HOST || "0.0.0.0";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  optimizeDeps: {
    include: prebundle,
  },
  server: {
    host,
    port: 3000,
    hmr: { overlay: false },
  },
  build: {
    sourcemap: false,
    manifest: false,
  },
})
