import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/hooks/use-toast';
import { supabase } from '@/services/supabaseClient';

// Fondo institucional
import adminBg from '/assets/admin-bg-ordinario.png';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [minH, setMinH] = useState('100svh');

  /* =========================
     Ajuste altura viewport móvil
  ========================= */
  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      setMinH(`${h}px`);
    };
    setVh();
    window.visualViewport?.addEventListener('resize', setVh);
    return () => window.visualViewport?.removeEventListener('resize', setVh);
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Token inválido o inexistente</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: 'Contraseña inválida',
        description: 'Debe tener al menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc('confirm_password_reset', {
      p_token: token,
      p_new_password: password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'El enlace es inválido o ha expirado.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Contraseña actualizada',
      description: 'Ahora puedes iniciar sesión.',
    });

    navigate('/login', { replace: true });
  };

  return (
    <div
      className="relative w-full text-white"
      style={{ minHeight: minH }}
    >
      {/* Fondo */}
      <div className="absolute inset-0 -z-10">
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${adminBg})` }}
        />
        {/* Overlay azul institucional */}
        <div className="absolute inset-0 bg-[hsl(200_100%_13.5%/_0.88)]" />
      </div>

      {/* Contenido */}
      <div className="flex items-center justify-center min-h-[inherit] px-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/10 text-white shadow-xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-aventura tracking-wide">
              Restablecer contraseña
            </CardTitle>
            <CardDescription className="text-white/80">
              Ingresa tu nueva contraseña
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/90">Nueva contraseña</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/90 text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="bg-white/90 text-slate-900"
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-accent"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
