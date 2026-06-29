// client/src/components/router/ProtectedRoute.tsx
import { useAuth } from '@/context/AuthContext';
import type { SessionUser } from '@/context/AuthContext'; // ¡Importa SessionUser!
import { Navigate } from 'react-router-dom';
import React from 'react';
import Cookies from 'js-cookie'; // ¡Importa js-cookie!

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando sesión...</div>;
  }

  // --- Misma corrección que en AdminRoute ---
  let currentUser: SessionUser | null = user;
  
  if (!currentUser) {
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
    // Si no hay usuario en contexto O cookie, a /login
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario, muestra la página (Home)
  return children;
}