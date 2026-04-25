import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'  // 'A' maiúsculo ← CORRETO

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)
