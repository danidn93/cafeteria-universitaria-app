import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import Cookies from 'js-cookie';
import { supabase } from '@/services/supabaseClient';
import { useNavigate } from 'react-router-dom';

/* =========================
   TIPOS
========================= */

export type SessionUser = {
  id: string;
  username: string;
  name: string | null;
  role: 'admin' | 'empleado' | 'staff' | 'user';

  direccion_id: string | null;
  direccion_slug: string | null;

  cafeteria_ids: string[]; // 👈 CLAVE
  fecha_nacimiento: string | null;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: SessionUser | null;
  loading: boolean;

  esAdminAC: boolean;
  esAdminTH: boolean;

  login: (email: string, password: string) => Promise<SessionUser | null>;
  checkEmail: (email: string) => Promise<{
    status: string;
    message: string;
    nombre?: string;
  }>;
  register: (email: string, password: string) => Promise<{
    status: string;
    message: string;
  }>;
  logout: () => void;
}

/* =========================
   CONTEXTO
========================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

/* =========================
   PROVIDER
========================= */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* =========================
     CARGA DESDE COOKIE
  ========================= */

  useEffect(() => {
    const raw = Cookies.get('app_session');
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SessionUser;
      setUser(parsed);
    } catch {
      Cookies.remove('app_session');
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================
     LOGIN
  ========================= */

  const login = async (
    email: string,
    password: string
  ): Promise<SessionUser | null> => {
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

    const sessionUser = data as SessionUser;

    Cookies.set('app_session', JSON.stringify(sessionUser), {
      expires: 7,
      sameSite: 'lax',
    });

    setUser(sessionUser);
    return sessionUser;
  };

  /* =========================
     CHECK EMAIL
  ========================= */

  const checkEmail = async (email: string) => {
    const { data, error } = await supabase.rpc('check_empleado_email', {
      p_email: email,
    });

    if (error) {
      return { status: 'error', message: error.message };
    }

    return data;
  };

  /* =========================
     REGISTER
  ========================= */

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.rpc('register_user_manual', {
      p_email: email,
      p_password: password,
    });

    if (error) {
      return { status: 'error', message: error.message };
    }

    return data;
  };

  /* =========================
     LOGOUT
  ========================= */

  const logout = () => {
    Cookies.remove('app_session');
    setUser(null);
    navigate('/login', { replace: true });
  };

  /* =========================
     ROLES
  ========================= */

  const esAdminAC = useMemo(
    () => !!user && user.direccion_slug === 'DAC',
    [user]
  );

  const esAdminTH = useMemo(
    () => !!user && user.direccion_slug === 'DTH',
    [user]
  );

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
