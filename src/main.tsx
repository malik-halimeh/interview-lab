import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { clearRecoveryMarker, recoverFromStaleBuild } from './lib/appRecovery'
import './styles.css'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  void recoverFromStaleBuild()
})

window.setTimeout(clearRecoveryMarker, 10_000)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
