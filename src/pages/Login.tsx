
// client/src/pages/Login.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import type { SessionUser } from '@/context/AuthContext';  // ¡Importamos SessionUser!
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';

// Tus Imágenes
import adminBgDesktop from '/assets/admin-bg-ordinario.png';
import adminBgMobile from '/assets/movil-bg-ordinario.png';
import logo from '/assets/logo-admin-ordinario.png';

type FormState = 'Login' | 'CheckEmail' | 'Register';

export default function Login() {
  const { user, login, checkEmail, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bgUrl, setBgUrl] = useState<string>(adminBgMobile);
  const [minH, setMinH] = useState<string>('100svh');
  
  const [formState, setFormState] = useState<FormState>('Login');
  const [nombre, setNombre] = useState('');

  // Tu useEffect para el fondo (¡Perfecto!)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const applyBg = () => setBgUrl(mq.matches ? adminBgDesktop : adminBgMobile);
    applyBg();
    mq.addEventListener('change', applyBg);
    return () => mq.removeEventListener('change', applyBg);
  }, []);

  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      setMinH(`${h}px`);
    };
    setVh();
    window.visualViewport?.addEventListener('resize', setVh);
    return () => window.visualViewport?.removeEventListener('resize', setVh);
  }, []);

  if (user) return <Navigate to="/" replace />;

  // --- LÓGICA DE HANDLERS ACTUALIZADA ---
  
  // ¡¡¡ ESTA ES LA CORRECCIÓN !!!
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 1. La función 'login' ahora devuelve el usuario o null
    const loggedInUser: SessionUser | null = await login(email, password);
    
    if (loggedInUser) {
      toast({ title: 'Inicio de sesión exitoso' });
      
      // 2. ¡DECISIÓN INTELIGENTE!
      // Verificamos el slug del usuario que nos devolvió el login
      if (loggedInUser.direccion_slug === 'DAC' || loggedInUser.direccion_slug === 'DTH') {
        navigate('/admin', { replace: true }); // ¡A la página de Admin!
      } else {
        navigate('/', { replace: true }); // A la página de usuario normal
      }
      
    } else {
      toast({ title: 'Error de autenticación', description: 'Correo o contraseña incorrectos', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await checkEmail(email.toLowerCase());
    
    if (result.status === 'success') {
      setNombre(result.nombre || '');
      setFormState('Register');
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
      if (result.status === 'info') {
        setFormState('Login');
      }
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await register(email, password);
    
    if (result.status === 'success') {
      toast({ title: '¡Registro Exitoso!', description: 'Ahora puedes iniciar sesión.' });
      setFormState('Login');
    } else {
      toast({ title: 'Error de Registro', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };
  
  // --- (El resto de tu JSX y funciones de renderizado se mantienen igual) ---
  const getCardHeader = () => {
    // ... (igual que antes)
    switch (formState) {
      case 'Register':
        return { title: `Hola, ${nombre}`, description: 'Crea tu contraseña' };
      case 'CheckEmail':
        return { title: 'Crear Cuenta', description: 'Ingresa tu correo institucional' };
      default:
        return { title: 'Inicio de Sesión', description: 'Ingresa tus credenciales' };
    }
  };

  const renderSubmitButton = () => {
    // ... (igual que antes)
    switch (formState) {
      case 'Register':
        return ( <Button type="submit" className="w-full btn-accent" disabled={isLoading}>{isLoading ? 'Creando...' : 'Crear Cuenta'}</Button> );
      case 'CheckEmail':
        return ( <Button type="submit" className="w-full btn-accent" disabled={isLoading}>{isLoading ? 'Verificando...' : 'Verificar Correo'}</Button> );
      default:
        return ( <Button type="submit" className="w-full btn-accent" disabled={isLoading}>{isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</Button> );
    }
  };
  
  const renderSecondaryButton = () => {
    // ... (igual que antes)
    if (formState === 'Login') {
      return (
        <Button variant="link" type="button" className="w-full mt-4 text-white/70"
          onClick={() => { setFormState('CheckEmail'); setPassword(''); }}>
          ¿No tienes cuenta? Regístrate aquí
        </Button>
      );
    }
    return (
      <Button variant="link" type="button" className="w-full mt-4 text-white/70"
        onClick={() => { setFormState('Login'); setPassword(''); }}>
        Ya tengo cuenta (Iniciar Sesión)
      </Button>
    );
  };

  const getSubmitHandler = () => {
    // ... (igual que antes)
    switch (formState) {
      case 'Register': return handleRegister;
      case 'CheckEmail': return handleCheckEmail;
      default: return handleLogin;
    }
  };

  const { title, description } = getCardHeader();

  return (
    // ¡Tu JSX se mantiene! (Con la clase 'unemi' y el fondo que te gusta)
    <div className="unemi admin-full relative text-white" style={{ minHeight: minH }}>
      
      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-no-repeat bg-center bg-cover" style={{ backgroundImage: `url(${bgUrl})` }} />
        <div className="absolute inset-0 bg-[hsl(200_100%_13.5%/_0.88)]" />
        <div className="hidden lg:block absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.15)_60%,rgba(0,0,0,0)_100%)]" />
      </div>

      <div className="w-full h-full">
        <div className="container mx-auto px-4 min-h-[inherit]">
          <div className="grid min-h-[inherit] lg:min-h-screen lg:grid-cols-2 items-center">
            <div className="flex justify-center lg:justify-start self-center">
              <div className="w-full max-w-md lg:ml-2 overflow-auto rounded-2xl">
                
                <Card className="w-full dashboard-card bg-white/10 backdrop-blur-md border-white/10">
                  <CardHeader className="text-center space-y-3">
                    <div className="mx-auto bg-white rounded-full p-1 shadow-md ring-2 ring-[hsl(24_100%_50%/_0.6)] w-max">
                      <img src={logo} alt="Logo" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-contain bg-white" draggable={false} />
                    </div>
                    <CardTitle className="text-2xl font-aventura tracking-wide">{title}</CardTitle>
                    <CardDescription className="card-subtitle text-white/85">{description}</CardDescription>
                  </CardHeader>

                  <CardContent className="card-inner">
                    <form onSubmit={getSubmitHandler()} className="space-y-4">
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white/90">Correo</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu.correo@empresa.com"
                          required
                          className="bg-white/90 text-[hsl(240_1.4%_13.5%)] placeholder:text-[hsl(240_1.4%_13.5%/_0.65)]"
                          autoCapitalize="none"
                          autoCorrect="off"
                          inputMode="email"
                          disabled={formState === 'Register'}
                        />
                      </div>

                      {formState !== 'CheckEmail' && (
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-white/90">Contraseña</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              required
                              className="bg-white/90 text-[hsl(240_1.4%_13.5%)] placeholder:text-[hsl(240_1.4%_13.5%/_0.65)] pr-12"
                              autoCapitalize="none"
                              autoCorrect="off"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-[hsl(var(--unemi-blue))]"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              <motion.div animate={{ scale: showPassword ? 1.1 : 1 }} transition={{ duration: 0.2 }}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </motion.div>
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {renderSubmitButton()}
                    </form>
                    
                    {renderSecondaryButton()}
                  </CardContent>
                </Card>

                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>
      </div>
    </div>
  );
};