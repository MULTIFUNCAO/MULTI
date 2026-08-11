import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

// Duas páginas:
//  - index.html   (raiz "/")    -> landing pública (HTML estático, sem build de JS)
//  - app/index.html ("/app")    -> o app React (o que antes era a raiz)
// Em dev, "npm run dev" agora abre a landing em "/"; o app fica em "/app/".
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
})
