import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"

class ErrorBoundary extends Error {}

window.onerror = function(msg,src,line,col,err){
  document.getElementById("root").innerHTML = "<pre style=color:red>ERRO: "+msg+"
Linha:"+line+"
"+(err&&err.stack||"")+"</pre>";
};
window.onunhandledrejection = function(e){
  document.getElementById("root").innerHTML = "<pre style=color:red>PROMISE: "+e.reason+"</pre>";
};

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>)