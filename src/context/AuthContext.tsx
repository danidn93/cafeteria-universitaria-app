// client/src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import Cookies from 'js-cookie';
import { supabase } from '@/services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';

// --- TIPOS ---

export type SessionUser = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  direccion_slug: string | null; 
  fecha_nacimiento: string | null;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: SessionUser | null;
  loading: boolean;
  esAdminAC: boolean; // DAC (Administración Cafetería)
  esAdminTH: boolean; // DTH (Talento Humano)

  login: (email: string, password: string) => Promise<SessionUser | null>;
  checkEmail: (email: string) => Promise<{ status: string; message: string; nombre?: string }>;
  register: (email: string, password: string) => Promise<{ status: string; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Carga inicial desde cookies (CON DIAGNÓSTICO)
  useEffect(() => {
    setLoading(true);
    const raw = Cookies.get('app_session');
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SessionUser;
        
        // 💡 DIAGNÓSTICO: Muestra el slug detectado
        console.log('✅ AuthContext: Cookie cargada. Slug detectado:', parsed.direccion_slug); 
        
        setUser(parsed);
      } catch { 
        console.error('❌ AuthContext: Error al parsear cookie.');
        Cookies.remove('app_session'); 
      }
    } else {
      console.log('❌ AuthContext: No se encontró la cookie app_session.');
    }
    
    setLoading(false);
  }, []);

  // Lógica de Login usando tu RPC
  const login = async (email: string, password: string): Promise<SessionUser | null> => {
    setLoading(true);
    const { data, error } = await supabase.rpc('login_user', {
      p_email: email,
      p_password: password,
    });
    
    setLoading(false);

    if (error || !data) { 
      console.error('Login error:', error);
      return null; 
    }
    
    const sessionUser: SessionUser = data as SessionUser;
    
    Cookies.set('app_session', JSON.stringify(sessionUser), { expires: 7 });
    setUser(sessionUser);
    
    // Todos los usuarios van a la ruta principal ('/')
    navigate('/');
    
    return sessionUser; 
  };

  const checkEmail = async (email: string) => {
    const { data, error } = await supabase.rpc('check_empleado_email', { p_email: email });
    if (error) { return { status: 'error', message: 'Error de red: ' + error.message }; }
    return data;
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.rpc('register_user_manual', { p_email: email, p_password: password });
    if (error) { return { status: 'error', message: 'Error de red: ' + error.message }; }
    return data;
  };

  const logout = () => {
    Cookies.remove('app_session');
    setUser(null);
    navigate('/login');
  };

  // Cálculo de Roles (Se mantiene)
  const esAdminAC = useMemo(() => {
    return !!user && user.direccion_slug === 'DAC';
  }, [user]);
  
  const esAdminTH = useMemo(() => {
    return !!user && user.direccion_slug === 'DTH';
  }, [user]);


  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    loading,
    esAdminAC, 
    esAdminTH, 
    login,
    checkEmail,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};