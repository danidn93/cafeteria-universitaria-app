// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // 👈 Importa el Provider
import './index.css'; // 👈 ¡IMPORTANTE! Importa tu CSS global (para Tailwind)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> 
        {/* AuthProvider envuelve a 'App' para que todas las páginas
            puedan saber si el usuario inició sesión */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
//