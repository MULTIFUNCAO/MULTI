import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"

window.onerror = function(msg, src, line, col, err) {
  document.getElementById("root").innerHTML = "<pre style='color:red'>ERRO: " + msg + " Linha:" + line + " " + (err && err.stack || "") + "</pre>";
};

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
)
