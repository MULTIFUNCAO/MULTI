import React from "react"
import { createRoot } from "react-dom/client"

async function bootstrap() {
  try {
    const { default: App } = await import("./App.jsx")
    createRoot(document.getElementById("root")).render(
      <React.StrictMode><App /></React.StrictMode>
    )
  } catch (error) {
    console.error("Erro ao inicializar o app:", error)
    const root = document.getElementById("root")
    if (root) {
      root.innerText = "ERRO: " + error.message
    }
  }
}

bootstrap()
