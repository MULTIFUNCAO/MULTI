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

const root=createRoot(document.getElementById("root"));setTimeout(()=>{console.log("ROOT HTML:",document.getElementById("root").innerHTML.slice(0,500));},2000);root.render(<StrictMode><App /></StrictMode>)