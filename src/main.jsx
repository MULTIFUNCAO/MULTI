import { createRoot } from "react-dom/client"

const root = document.getElementById("root")
root.innerHTML = "<h1 style='color:blue'>JS FUNCIONANDO</h1>"

try {
  const { default: App } = await import("./App.jsx")
  root.innerHTML = ""
  createRoot(root).render(App ? "<div>App carregado</div>" : "<div>App undefined</div>")
} catch(e) {
  root.innerHTML = "<pre style='color:red'>ERRO NO IMPORT: " + e.message + "\n" + e.stack + "</pre>"
}
