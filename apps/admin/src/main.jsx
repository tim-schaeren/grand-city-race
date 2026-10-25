import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { rootOptions } from './crashes'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root'), rootOptions).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
