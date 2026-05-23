import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

window.onerror = function(msg, src, line, col, err) {
  document.getElementById('root').innerHTML = '<pre style="color:red;padding:20px;font-size:12px">ERRO: ' + msg + '\nLinha: ' + line + '\n' + (err ? err.stack : '') + '</pre>';
};

window.onunhandledrejection = function(e) {
  document.getElementById('root').innerHTML = '<pre style="color:red;padding:20px;font-size:12px">PROMISE ERROR: ' + e.reason + '</pre>';
};

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)