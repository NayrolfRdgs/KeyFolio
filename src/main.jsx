import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/common/ErrorBoundary'
import './index.css'

// Global error handler to prevent silent white screens
window.onerror = function(msg, url, line, col, error) {
  console.error('[KeyFolio Startup Error]', msg, url, line, col, error)
  const root = document.getElementById('root')
  if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
    root.innerHTML = `
      <div style="padding: 40px; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background: #1e293b; padding: 24px; border-radius: 12px; max-width: 640px; border: 1px solid #ef4444; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <h2 style="color: #ef4444; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
            ⚠️ Erreur au démarrage de KeyFolio
          </h2>
          <p style="color: #94a3b8; font-size: 13.5px; margin: 0 0 12px 0;">
            ${msg} (${url ? url.split('/').pop() : 'script'}:${line}:${col})
          </p>
          <pre style="background: #0f172a; color: #fca5a5; padding: 12px; border-radius: 6px; font-size: 11.5px; overflow: auto; max-height: 250px; border: 1px solid #7f1d1d;">${error?.stack || msg}</pre>
          <div style="display: flex; gap: 10px; margin-top: 18px;">
            <button onclick="window.location.reload()" style="background: #6366f1; color: white; border: none; padding: 9px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">
              ↻ Recharger l'application
            </button>
          </div>
        </div>
      </div>
    `
  }
}

console.log('%c🎨 KeyFolio — FlowCreativeStudio', 'color:#6366f1;font-weight:bold;font-size:14px')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
