import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/multi-mppjzzwk.js",
        chunkFileNames: "assets/chunk-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
})