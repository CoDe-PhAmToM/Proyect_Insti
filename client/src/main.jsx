import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { engancharErroresGlobales } from './lib/reportarError'
import './index.css'

// Antes de renderizar: si algo falla durante el primer render, ese
// es justamente el error que más importa ver.
engancharErroresGlobales()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
