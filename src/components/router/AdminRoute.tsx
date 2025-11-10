// client/src/components/router/AdminRoute.tsx
import { useAuth } from '@/context/AuthContext';
import type { SessionUser } from '@/context/AuthContext'; // ¡Importa SessionUser!
import { Navigate } from 'react-router-dom';
import React from 'react';
import Cookies from 'js-cookie'; // ¡Importa js-cookie!

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(); // Todavía usamos 'loading'

  if (loading) {
    return <div>Cargando sesión...</div>;
  }

  // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
  // El 'user' del AuthContext puede estar "obsoleto" (stale) por 1 render
  // después del login. Para el guardián, leemos la "verdad"
  // directamente de la Cookie que se acaba de guardar.
  
  let currentUser: SessionUser | null = user; // Empezamos con el del contexto
  
  if (!currentUser) {
    // Si el contexto dice que no hay usuario, revisamos la cookie por si acaso
    const raw = Cookies.get('app_session');
    if (raw) {
      try {
        currentUser = JSON.parse(raw) as SessionUser;
      } catch {
        currentUser = null;
      }
    }
  }

  if (!currentUser) {
    // Ahora sí, si NI el contexto NI la cookie tienen usuario, a /login
    return <Navigate to="/login" replace />;
  }

  // Ahora comprobamos el slug del 'currentUser'
  const slug = currentUser.direccion_slug?.toLowerCase();
  
  if (slug === 'dac' || slug === 'dth') {
    return children; // ¡Acceso concedido!
  }

  // No es admin, patearlo a Home
  return <Navigate to="/" replace />;
}