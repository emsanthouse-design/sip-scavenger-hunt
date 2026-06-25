import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { initOutbox } from './lib/outbox'

// Start the offline submission queue as soon as the app boots so any
// submissions left over from a previous (dropped) session resume uploading.
initOutbox()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
