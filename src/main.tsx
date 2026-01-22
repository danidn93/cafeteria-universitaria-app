import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

/* ─────────────────────────────────────────────
   REGISTRO DEL SERVICE WORKER (OBLIGATORIO)
   ───────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] registrado correctamente', reg.scope);
      })
      .catch((err) => {
        console.error('[SW] error al registrar', err);
      });
  });
}
/* ───────────────────────────────────────────── */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
