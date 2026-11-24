import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import FieldApp from './FieldApp';

createRoot(document.getElementById('root')!).render(<StrictMode><FieldApp /></StrictMode>);

// Installable and usable with no signal: the service worker keeps the app itself on the phone.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/field/sw.js', { scope: '/field/' }).catch(() => {}); });
}
