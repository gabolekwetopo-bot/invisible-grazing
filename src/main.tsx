import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { hydrateSeedAreas } from './lib/seedHydrate'
import { DEMONSTRATION_AREAS } from './data/demonstration'

/**
 * Runs seed hydration once, before rendering the main app, so the four seed
 * areas arrive with real Sentinel-2 NDVI and real NASA POWER rainfall the first
 * time the site is opened. Subsequent loads read from localStorage instantly.
 */
function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('Preparing monitoring areas…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        await hydrateSeedAreas(DEMONSTRATION_AREAS, (msg) => {
          if (!cancelled) setMessage(msg)
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[IG] Seed hydration failed, continuing with empty series:', err)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'var(--ig-bg)',
          color: 'var(--ig-text-muted)',
          fontFamily: 'var(--ig-font-sans)',
        }}
      >
        <img src="/logo.svg" alt="" style={{ width: 48, height: 48 }} />
        <div style={{ fontWeight: 600, letterSpacing: '0.14em', fontSize: 12, color: 'var(--ig-forest)' }}>
          INVISIBLE GRAZING
        </div>
        <div style={{ fontSize: 13 }}>{message}</div>
      </div>
    )
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
