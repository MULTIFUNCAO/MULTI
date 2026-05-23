import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode><App /></StrictMode>
  )
  setTimeout(()=>{
    var root = document.getElementById('root');
    var html = root ? root.innerHTML.slice(0,200) : 'root nao encontrado';
    document.title = 'DBG:' + html;
    console.log('ROOT HTML:', html);
  }, 2000);
} catch(e) {
  document.getElementById('root').innerHTML = '<pre style="color:red;padding:20px">' + e.message + '\n' + e.stack + '</pre>';
}