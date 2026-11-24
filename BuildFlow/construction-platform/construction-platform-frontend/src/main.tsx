// Dark is the default look; the choice is remembered (components/AppShell.tsx).
try { if ((localStorage.getItem('bf-theme') ?? 'dark') === 'dark') document.documentElement.classList.add('dark'); } catch { document.documentElement.classList.add('dark'); }
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
