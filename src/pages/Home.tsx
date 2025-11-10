// client/src/pages/Home.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import type { SessionUser } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';

// --- Tus Imágenes de Fondo y Logo ---
import adminBgDesktop from '/assets/admin-bg-navidad.png';
import adminBgMobile from '/assets/movil-bg-navidad.png';
import logo from '/assets/logo-admin-navidad.png';

// --- Componentes de UI ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; 
import { toast } from '@/components/hooks/use-toast';

// --- Iconos ---
import { Cake, Coffee, LogOut, MinusCircle, ShoppingBag, Clock, History, MessageSquare, Loader2, Star, KeyRound, Trophy, Timer } from 'lucide-react';

// --- Tipos de Datos ---
interface Item {
  id: string;
  nombre: string;
  disponible: boolean;
  image_url: string | null;
  description: string | null;
  tipo: string | null;
}
interface OrderItem extends Item { quantity: number }

interface Pedido {
  id: string;
  estado: string;
  created_at: string;
  updated_at: string;
  calificado: boolean;
  items: { item_nombre: string; cantidad: number }[];
}

interface Config {
  abierto: boolean;
  nombre_local: string;
  horario: string;
  horario_arr: string[];
}

const getHorarioHoy = (horarioArr: string[]): string => {
  const dayIndex = new Date().getDay();
  const todayIndex = (dayIndex + 6) % 7;
  return horarioArr[todayIndex] || "Horario no disponible";
};

// ✨ Tipo para el motivo del bloqueo
type BlockReasonCode = "TIME_LOCK" | "RATING_LOCK";

export default function Home() {
  const { user, logout } = useAuth();
  
  const [bgUrl, setBgUrl] = useState<string>(adminBgMobile);
  const [minH, setMinH] = useState<string>('100svh');
  
  const [items, setItems] = useState<Item[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([]);
  const [pedidosHistorial, setPedidosHistorial] = useState<Pedido[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [ranking, setRanking] = useState<number | null>(null);
  const [loadingRanking, setLoadingRanking] = useState(true);

  // --- ✨ Estados de bloqueo y temporizador ---
  const [blockReason, setBlockReason] = useState<BlockReasonCode | null>(null);
  const [blockExpiresAt, setBlockExpiresAt] = useState<Date | null>(null);
  const [countdownDisplay, setCountdownDisplay] = useState<string | null>(null);

  // --- Efectos de Fondo ---
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

  // --- Funciones de Fetch (Completas) ---
  const fetchConfig = async () => {
    const { data, error } = await supabase.from('configuracion').select('*').single();
    if (data) setConfig(data);
    if (error) console.error('Error fetching config:', error.message);
  };

  const fetchMenu = async () => {
    setLoadingItems(true);
    const { data, error } = await supabase.from('items').select('*');
    if (data) setItems(data);
    if (error) console.error('Error fetching items:', error.message);
    setLoadingItems(false);
  };

  const fetchPedidos = async () => {
    if (!user) return;
    setLoadingPedidos(true); 
    const { data, error } = await supabase
      .from('pedidos_pwa')
      // ✨ Seleccionamos updated_at
      .select(`id, estado, created_at, updated_at, calificado, items:pedido_pwa_items ( item_nombre, cantidad )`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching pedidos:', error.message);
    } else if (data) {
      setPedidosActivos(data.filter(p => p.estado === 'pendiente' || p.estado === 'preparando' || p.estado === 'listo'));
      setPedidosHistorial(data.filter(p => p.estado === 'entregado'));
    }
    //setLoadingPedidos(false);
  };

  // --- ✨ FUNCIÓN DE RANKING ACTUALIZADA ---
  const fetchUserRanking = async () => {
    if (!user) return;
    setLoadingRanking(true);

    // --- REAL RPC CALL ---
    // Llama a la función que creaste en el Paso 1
    const { data, error } = await supabase.rpc('get_user_last_month_rank', {
      p_user_id: user.id 
    });

    if (error) {
      console.error('Error fetching ranking:', error.message);
      setRanking(null); // No muestra el widget si hay error
    } else {
      // data será el ranking (ej. 5) o null si no tuvo pedidos
      setRanking(data); 
    }
    // --- FIN REAL CALL ---
    
    setLoadingRanking(false);
  };
  
  // --- Efectos de Carga de Datos ---
  useEffect(() => {
    if (!user) {
      setLoadingItems(false);
      setLoadingPedidos(false);
      return;
    }
    fetchConfig();
    fetchMenu();
    fetchUserRanking(); // ✨ Llamada actualizada
    if (user.fecha_nacimiento) {
      checkBirthday(user.fecha_nacimiento);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // 1. Función interna para la carga inicial (CON spinner)
    const loadInitialPedidos = async () => {
      setLoadingPedidos(true); // <-- Spinner ON
      await fetchPedidos();
      setLoadingPedidos(false); // <-- Spinner OFF
    };

    // 2. Ejecutar la carga inicial
    loadInitialPedidos();

    // 3. Establecer el intervalo silencioso
    // (fetchPedidos ya no activa el spinner)
    const intervalId = setInterval(() => {
      fetchPedidos();
    }, 5000);

    // 4. Limpiar el intervalo
    return () => clearInterval(intervalId);
  }, [user]);

  // --- ✨ Efecto de Lógica de Bloqueo ---
  useEffect(() => {
    if (loadingPedidos) return;

    // 1. Encontrar el pedido más reciente (activo o historial)
    const lastActive = pedidosActivos[0];
    const lastHistorical = pedidosHistorial[0];
    let mostRecentOrder: Pedido | null = null;

    if (lastActive && lastHistorical) {
      mostRecentOrder = new Date(lastActive.created_at) > new Date(lastHistorical.created_at) ? lastActive : lastHistorical;
    } else {
      mostRecentOrder = lastActive || lastHistorical || null;
    }

    // 2. Comprobar bloqueo por tiempo (1 hora)
    if (mostRecentOrder) {
      const lastOrderTime = new Date(mostRecentOrder.created_at);
      // La hora de expiración es 1h después del *último* pedido
      const expirationTime = new Date(lastOrderTime.getTime() + 60 * 60 * 1000); 
      
      if (expirationTime.getTime() > Date.now()) {
        setBlockReason("TIME_LOCK");
        setBlockExpiresAt(expirationTime);
        return; // El bloqueo por tiempo tiene prioridad
      }
    }

    // 3. Comprobar bloqueo por calificación (si no hay bloqueo por tiempo)
    const lastDeliveredOrder = pedidosHistorial[0];
    if (lastDeliveredOrder && !lastDeliveredOrder.calificado) {
      setBlockReason("RATING_LOCK");
      setBlockExpiresAt(null); // No hay tiempo de expiración
      return;
    }

    // 4. Si no hay bloqueos
    setBlockReason(null);
    setBlockExpiresAt(null);

  }, [pedidosActivos, pedidosHistorial, loadingPedidos]);

  // --- ✨ NUEVO: Efecto de Temporizador ---
  // Se ejecuta cada 10 segundos para actualizar el contador
  useEffect(() => {
    const updateCountdown = () => {
      if (blockReason === "TIME_LOCK" && blockExpiresAt) {
        const diff = blockExpiresAt.getTime() - Date.now();
        
        if (diff <= 0) {
          // El tiempo expiró. Limpiamos el estado.
          // El 'useEffect' de bloqueo (arriba) se re-ejecutará 
          // (por el polling de 5s) y comprobará el RATING_LOCK.
          setBlockExpiresAt(null);
          setBlockReason(null);
          setCountdownDisplay(null);
        } else {
          // Calculamos minutos restantes
          const minutesLeft = Math.ceil(diff / (1000 * 60));
          setCountdownDisplay(`Próximo pedido en ${minutesLeft} min.`);
        }
      } else if (blockReason === "RATING_LOCK") {
        setCountdownDisplay("Debes calificar tu último pedido para pedir de nuevo.");
      } else {
        setCountdownDisplay(null);
      }
    };

    // Ejecutar inmediatamente
    updateCountdown();

    // Establecer intervalo para actualizar el contador
    const intervalId = setInterval(updateCountdown, 10000); // Actualiza cada 10 seg

    return () => clearInterval(intervalId); // Limpiar
    
  }, [blockReason, blockExpiresAt]);

  // --- Lógica de Cumpleaños (Completa) ---
  const checkBirthday = (birthDate: string) => {
    try {
      const today = new Date();
      const parts = birthDate.split('-');
      const birthYear = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10) - 1;
      const birthDay = parseInt(parts[2], 10);

      const isSameMonth = today.getMonth() === birthMonth;
      const isSameDay = today.getDate() === birthDay;
      
      if (isSameMonth && isSameDay) {
        setShowBirthdayModal(true);
        let age = today.getFullYear() - birthYear;
        const m = today.getMonth() - birthMonth;
        if (m < 0 || (m === 0 && today.getDate() < birthDay)) age--;
        setUserAge(age);
      }
    } catch (e) { console.error("Error parsing birth date", e); }
  };

  // --- Estados Derivados Finales ---
  const isOrderBlocked = !!blockReason;
  const finalBlockReason = blockReason === "RATING_LOCK" 
    ? "Debes calificar tu último pedido. (Ver en 'Mis Pedidos')" 
    : countdownDisplay; // (countdownDisplay ya es el mensaje de tiempo)
  
  // --- Lógica de Pedido (Completa) ---
  // --- Lógica de Pedido (Completa) ---
  const handleUpdateQuantity = (item: Item, action: 'inc' | 'dec') => {
    
    // ----- LÓGICA DE 'DEC' (REDUCIR) -----
    // Si el usuario presiona 'Reducir', la única acción
    // posible es vaciar el carrito, ya que solo puede haber 1 item.
    if (action === 'dec') {
      setOrder([]);
      return;
    }

    // ----- LÓGICA DE 'INC' (SELECCIONAR) -----
    if (action === 'inc') {
      
      // 1. COMPROBAR BLOQUEO GLOBAL (Tiempo o Calificación)
      // Esto se comprueba primero, antes de intentar añadir nada.
      if (isOrderBlocked) {
         toast({
            title: 'Pedido bloqueado',
            description: finalBlockReason, // Muestra el temporizador o el error
            variant: 'destructive',
            duration: 5000,
         });
         return; // Detiene la función
      }

      // 2. COMPROBAR LÍMITE DE 1 PRODUCTO
      // Esta es la validación que buscas:
      // Si el carrito (order) YA tiene un item (length > 0),
      // mostramos un error y detenemos la función.
      if (order.length > 0) {
        toast({
            title: 'Límite de productos alcanzado',
            description: 'Solo puedes seleccionar un producto a la vez.',
            variant: 'destructive',
            duration: 4000,
        });
        return; // Detiene la función
      }

      // 3. AÑADIR EL PRODUCTO
      // Si pasa las dos comprobaciones (no bloqueado Y carrito vacío),
      // se añade el item con cantidad 1.
      setOrder([{ ...item, quantity: 1 }]);
      
      // Abrir el "sheet" (carrito) si no está abierto
      if (!isSheetOpen) {
        setIsSheetOpen(true);
      }
    }
  };
  const handleSubmitOrder = async () => {
    // ✨ Doble comprobación
    if (isOrderBlocked) {
       toast({
          title: 'Pedido bloqueado',
          description: finalBlockReason,
          variant: 'destructive',
       });
       return;
    }

    if (!user || order.length === 0) return; 
    setIsSubmitting(true);
    try {
      const { data: pedidoData, error: pedidoError } = await supabase.from('pedidos_pwa').insert({ user_id: user.id, estado: 'pendiente' }).select('id').single();
      if (pedidoError || !pedidoData) throw pedidoError || new Error('No se pudo crear el pedido.');
      const newPedidoId = pedidoData.id;
      const itemsToInsert = order.map(item => ({ pedido_pwa_id: newPedidoId, item_id: item.id, cantidad: item.quantity, item_nombre: item.nombre }));
      const { error: itemsError } = await supabase.from('pedido_pwa_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
      toast({ title: '¡Pedido Confirmado!', description: 'Muchas Gracias.' });
      setOrder([]);
      setIsSheetOpen(false);
      fetchPedidos();
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({ title: 'Error al enviar el pedido', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const itemsPorCategoria = useMemo(() => {
    const cafes = items.filter(item => item.tipo === 'cafe' && item.disponible);
    const snacks = items.filter(item => item.tipo === 'snack' && item.disponible);
    const bebidas = items.filter(item => (item.tipo !== 'cafe' && item.tipo !== 'snack') && item.disponible);
    const noDisponibles = items.filter(item => !item.disponible);
    return { cafes, bebidas, snacks, noDisponibles };
  }, [items]);
  
  // ----- RENDERIZADO (JSX) -----
  return (
    <div className="unemi text-white relative pb-24" style={{ minHeight: minH }}>
      
      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-no-repeat bg-center bg-cover" style={{ backgroundImage: `url(${bgUrl})` }} />
        <div className="absolute inset-0 bg-[hsl(200_100%_13.5%/_0.88)]" />
      </div>
      
      <header className="p-4 flex justify-between items-start">
        <div>
            <h1 className="text-xl font-bold">Hola, {user && (user.name?.split(' ')[0] || 'Empleado')} </h1>
            <p className="text-white opacity-90">{config?.nombre_local || "Cafetería Universitaria"}</p>
            <div className="mt-3 text-sm text-white opacity-70 flex items-center gap-4">
              <div className='flex items-center gap-1.5'>
                <Clock className="h-4 w-4" />
                <span>{config ? getHorarioHoy(config.horario_arr) : "..."}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className={`h-2 w-2 rounded-full ${config?.abierto ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{config?.abierto ? 'Abierta' : 'Cerrada'}</span>
              </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full border-2 border-unemi-orange" />
          <SugerenciasDialog user={user} />
          <ChangePasswordDialog user={user} />
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar Sesión" className="shrink-0">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <BirthdayModal 
        isOpen={showBirthdayModal} 
        onClose={() => setShowBirthdayModal(false)} 
        name={user?.name?.split(' ')[0] || 'Empleado'} 
        age={userAge}
      />

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
            <TabsTrigger value="menu" className="data-[state=active]:bg-unemi-orange data-[state=active]:text-white text-white">Menú</TabsTrigger>
            <TabsTrigger value="pedidos" className="data-[state=active]:bg-unemi-orange data-[state=active]:text-white text-white">Mis Pedidos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="menu">
            {/* ✨ Widget de Ranking (Ahora es real) */}
            <RankingWidget loading={loadingRanking} ranking={ranking} />

            {/* ✨ Widget de Temporizador / Bloqueo */}
            <OrderLockWidget
              loading={loadingPedidos}
              isBlocked={isOrderBlocked}
              reason={finalBlockReason} // Pasa el string final
            />

            <PedidosActivosWidget loading={loadingPedidos} activos={pedidosActivos} />
            {loadingItems ? (
              <div className="text-center py-10"><Coffee className="h-12 w-12 mx-auto animate-pulse text-white/70" /><p className="text-white/70 mt-2">Cargando menú...</p></div>
            ) : (
              <>
                {itemsPorCategoria.cafes.length > 0 && (<><h2 className="font-aventura text-2xl font-bold mt-6 mb-4 text-orange-400 flex items-center gap-2"><Coffee /> Cafés</h2><ProductGrid items={itemsPorCategoria.cafes} onUpdateQuantity={handleUpdateQuantity} order={order} /></>)}
                {itemsPorCategoria.bebidas.length > 0 && (<><h2 className="font-aventura text-2xl font-bold mt-8 mb-4 text-orange-400">Nuestras Bebidas</h2><ProductGrid items={itemsPorCategoria.bebidas} onUpdateQuantity={handleUpdateQuantity} order={order} /></>)}
                {itemsPorCategoria.snacks.length > 0 && (<><h2 className="font-aventura text-2xl font-bold mt-8 mb-4 text-orange-400">Snacks</h2><ProductGrid items={itemsPorCategoria.snacks} onUpdateQuantity={handleUpdateQuantity} order={order} /></>)}
                {itemsPorCategoria.noDisponibles.length > 0 && (<><h2 className="font-aventura text-2xl font-bold mt-8 mb-4 text-white/70">No Disponibles</h2><ProductGrid items={itemsPorCategoria.noDisponibles} onUpdateQuantity={() => {}} order={order} disabled={true} /></>)}
                {items.length === 0 && !loadingItems && (<div className="text-center py-10"><p className="text-white/70">No hay items en el menú.</p></div>)}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="pedidos">
            <PedidosHistorialList 
              user={user} 
              loading={loadingPedidos} 
              historial={pedidosHistorial}
              onRatingSuccess={fetchPedidos}
            />
          </TabsContent>
        </Tabs>
      </main>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          {order.length > 0 && (
             <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-4 right-4 z-50">
              <Button 
                variant="default" 
                className="bg-white text-black rounded-full h-16 w-auto p-4 shadow-lg text-lg hover:bg-white/90"
              >
                <ShoppingBag className="mr-2 h-6 w-6" />
                Ver Pedido ({order.reduce((acc, item) => acc + item.quantity, 0)})
              </Button>
            </motion.div>
          )}
        </SheetTrigger>
        
        <SheetContent className="bg-white text-neutral-900">
          <SheetHeader>
            <SheetTitle className="font-aventura text-2xl text-neutral-900">Tu Pedido</SheetTitle>
            <SheetDescription className="text-neutral-600">Confirma tu selección. Es cortesía de la casa.</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4">
            {order.length === 0 ? (<p className="text-neutral-500">Aún no has seleccionado nada.</p>) : (
              order.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-neutral-900">{item.nombre}</p>
                    
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item, 'dec')}><MinusCircle className="h-4 w-4" /></Button>
                    <span className="w-8 text-center font-bold text-neutral-900">{item.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* --- ✨ Footer del Carrito Actualizado --- */}
          <SheetFooter className="flex flex-col gap-2">
            <Button 
              type="submit" 
              variant="secondary" 
              className="w-full" 
              disabled={isSubmitting || order.length === 0 || isOrderBlocked} // ✨ Bloqueado aquí
              onClick={handleSubmitOrder}
            >
              {isSubmitting ? 'Confirmando...' : (isOrderBlocked ? 'Pedido Bloqueado' : 'Confirmar Pedido')}
            </Button>
            
            {/* Mensaje de error si está bloqueado */}
            {isOrderBlocked && order.length > 0 && (
              <p className="text-sm text-red-600 text-center">{finalBlockReason}</p>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ----- Componentes Auxiliares -----
function OrderLockWidget({ loading, isBlocked, reason }: { loading: boolean, isBlocked: boolean, reason: string | null }) {
  // No mostrar nada si estamos cargando o si no hay bloqueo
  if (loading || !isBlocked || !reason) return null;

  return (
    <div className="relative bg-gradient-to-r from-red-600 to-orange-600 p-4 rounded-lg shadow-lg text-white my-6">
      <div className="flex items-center gap-4">
        <Timer className="h-10 w-10 text-white/80" />
        <div>
          <h4 className="font-aventura text-xl font-bold">Pedido Bloqueado</h4>
          <p className="text-sm opacity-90">
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
}

// ✨ Widget de Ranking (Sin cambios, ahora recibe data real)
function RankingWidget({ loading, ranking }: { loading: boolean, ranking: number | null }) {
  if (loading) {
    return (
      <div className="text-center py-6">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-white/70" />
        <p className="text-white/70 mt-2">Cargando tu ranking...</p>
      </div>
    );
  }

  // No muestra nada si el usuario no tiene ranking (o tuvo 0 pedidos)
  if (!ranking) return null;

  return (
    <div className="relative bg-gradient-to-r from-orange-500 to-yellow-400 p-4 rounded-lg shadow-lg text-white my-6 overflow-hidden">
      <div className="flex items-center gap-4">
        <Trophy className="h-10 w-10 text-yellow-200" />
        <div>
          <h4 className="font-aventura text-xl font-bold">¡Felicidades!</h4>
          <p className="text-sm opacity-90">
            Fuiste el <strong>Top #{ranking}</strong> en pedidos el mes pasado.
          </p>
        </div>
      </div>
      <div className="absolute -top-2 -right-2 bg-yellow-300 w-16 h-16 transform rotate-45" style={{ filter: 'opacity(0.5)' }}></div>
    </div>
  );
}

// ✨ Diálogo para Cambiar Contraseña (Llamada RPC real)
function ChangePasswordDialog({ user }: { user: SessionUser | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!newPassword || !confirmPassword) {
      toast({ title: 'Campos vacíos', description: 'Por favor, ingresa y repite la contraseña.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
       toast({ title: 'Contraseña muy corta', description: 'Debe tener al menos 6 caracteres.', variant: 'destructive' });
       return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', description: 'Por favor, verifica la contraseña.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    // 
    // --- IMPORTANTE ---
    // Aún necesitas crear la función RPC 'update_user_password' en Supabase
    // para que esto funcione.
    //
    
    const { error } = await supabase.rpc('update_user_password', {
      p_user_id: user.id,
      p_new_password: newPassword
    });

    if (error) {
      toast({ title: 'Error al actualizar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'Tu contraseña ha sido actualizada.' });
      setNewPassword("");
      setConfirmPassword("");
      setIsOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar Contraseña">
          <KeyRound className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white text-neutral-900">
        <DialogHeader>
          <DialogTitle className="font-aventura text-2xl text-neutral-900">Cambiar Contraseña</DialogTitle>
          <DialogDescription className="text-neutral-600">
            Ingresa tu nueva contraseña.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            type="password"
            placeholder="Nueva Contraseña (mín. 6 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-gray-100 text-neutral-900"
          />
          <Input
            type="password"
            placeholder="Repetir Contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-gray-100 text-neutral-900"
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Componente: Cuadrícula de Productos -----
function ProductGrid({ items, onUpdateQuantity, order, disabled = false }: { items: Item[], onUpdateQuantity: (item: Item, action: 'inc' | 'dec') => void, order: OrderItem[], disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map(item => {
        const itemInOrder = order.find(i => i.id === item.id);
        const quantity = itemInOrder?.quantity || 0;
        
        return (
          <Card key={item.id} className={`dashboard-card flex flex-col justify-between ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            <CardHeader className="p-0"><img src={item.image_url || 'https://placehold.co/600x400/002E45/FF6900?text=Caf%C3%A9'} alt={item.nombre} className="rounded-t-lg aspect-video object-cover" /></CardHeader>
            <CardContent className="p-4 flex-grow">
              <CardTitle className="font-aventura text-lg">{item.nombre}</CardTitle>
              <CardDescription className="text-sm mt-1 opacity-80">{item.description}</CardDescription>
            </CardContent>
            <div className="p-4 pt-0">
              {quantity === 0 ? (
                <Button className="w-full" variant="secondary" onClick={() => onUpdateQuantity(item, 'inc')} disabled={disabled}>
                  Seleccionar
                </Button>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => onUpdateQuantity(item, 'dec')}><MinusCircle className="h-5 w-5" /></Button>
                  <span className="w-10 text-center text-xl font-bold">{quantity}</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// --- Componente para mostrar el ESTADO del Pedido ---
function PedidosActivosWidget({ loading, activos }: { loading: boolean, activos: Pedido[] }) {
  if (loading && activos.length === 0) {
    return (
      <div className="text-center py-6">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-white/70" />
        <p className="text-white/70 mt-2">Buscando pedidos activos...</p>
      </div>
    );
  }
  if (!loading && activos.length === 0) return null;
  
  const getStatusInfo = (estado: string) => {
    if (estado === 'pendiente') return { text: 'Pedido Recibido', icon: <Loader2 className="h-4 w-4 animate-spin text-yellow-400" /> };
    if (estado === 'preparando') return { text: 'Preparando ☕', icon: <Coffee className="h-4 w-4 text-blue-400" /> };
    if (estado === 'listo') return { text: '¡Listo para retirar, Acérquese a retirar su pedido! 🍶', icon: <ShoppingBag className="h-4 w-4 text-green-400" /> };
    return { text: 'Desconocido', icon: <></> };
  };

  return (
    <div className="space-y-4 mt-6 mb-8">
      <h3 className="font-aventura text-xl font-bold text-white">Tu Pedido en Curso</h3>
      {activos.map(pedido => {
        const status = getStatusInfo(pedido.estado);
        return (
          <Card key={pedido.id} className="dashboard-card border-l-4 border-unemi-orange">
            <CardHeader><CardTitle className={`font-aventura text-lg flex justify-between items-center text-white`}><span className="flex items-center gap-2">{status.icon}{status.text}</span></CardTitle><CardDescription className="text-white/70">Realizado {new Date(pedido.created_at).toLocaleString('es-EC', { hour: '2-digit', minute: '2-digit' })}</CardDescription></CardHeader>
            <CardContent><ul className="list-disc pl-5 text-white/70 text-sm">{pedido.items.map((item, idx) => (<li key={idx}>{item.cantidad}x {item.item_nombre}</li>))}</ul></CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ----- Componente: Lista de Historial -----
function PedidosHistorialList({ user, loading, historial, onRatingSuccess }: { user: SessionUser | null, loading: boolean, historial: Pedido[], onRatingSuccess: () => void }) {
  if (loading) {
    return <div className="text-center py-10"><History className="h-12 w-12 mx-auto animate-spin text-white/70" /><p className="text-white/70 mt-2">Cargando historial...</p></div>;
  }
  
  return (
    <div className="space-y-8 mt-6">
      <div>
        <h3 className="font-aventura text-xl font-bold mb-4 text-white">Historial de Pedidos</h3>
        {historial.length === 0 && <p className="text-white/70">Aún no tienes historial de pedidos.</p>}
        <div className="space-y-4">
          {historial.map(pedido => (
            <Card key={pedido.id} className="dashboard-card opacity-70">
              <CardHeader>
                <CardTitle className="font-aventura text-white/70">Entregado</CardTitle>
                <CardDescription className="text-white/70">Pedido del {new Date(pedido.created_at).toLocaleString('es-EC', { day: '2-digit', month: 'long' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-white/70 text-sm mb-4">
                  {pedido.items.map((item, idx) => (
                    <li key={idx}>{item.cantidad}x {item.item_nombre}</li>
                  ))}
                </ul>
                <RatingDialog 
                  user={user} 
                  pedidoId={pedido.id}
                  initialCalificado={pedido.calificado}
                  onRatingSuccess={onRatingSuccess}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- Componente: Diálogo de Sugerencias -----
function SugerenciasDialog({ user }: { user: SessionUser | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !mensaje.trim()) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('sugerencias_pwa').insert({ user_id: user.id, mensaje: mensaje.trim() });
    if (error) {
      toast({ title: 'Error al enviar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '¡Gracias!', description: 'Tu sugerencia ha sido enviada.' });
      setMensaje("");
      setIsOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Enviar Sugerencia">
          <MessageSquare className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white text-neutral-900">
        <DialogHeader>
          <DialogTitle className="font-aventura text-2xl text-neutral-900">Sugerencias y Comentarios</DialogTitle>
          <DialogDescription className="text-neutral-600">
            Ayúdanos a mejorar. ¿Qué te gustaría ver? ¿Cómo podemos mejorar?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Escribe tu comentario aquí..."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="bg-gray-100 text-neutral-900"
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" className="w-full" onClick={handleSubmit} disabled={isSubmitting || !mensaje.trim()}>
            {isSubmitting ? "Enviando..." : "Enviar Sugerencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Componente: Diálogo de Calificación -----
function RatingDialog({ user, pedidoId, initialCalificado, onRatingSuccess }: { user: SessionUser | null, pedidoId: string, initialCalificado: boolean, onRatingSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yaCalificado, setYaCalificado] = useState(initialCalificado);

  useEffect(() => {
    setYaCalificado(initialCalificado);
  }, [initialCalificado]);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setIsSubmitting(true);
    try {
      const { error: ratingError } = await supabase.from('calificaciones_pwa').insert({
        user_id: user.id,
        pedido_id: pedidoId,
        estrellas: rating,
        comentario: comentario.trim()
      });
      if (ratingError) throw ratingError;

      const { error: updateError } = await supabase
        .from('pedidos_pwa')
        .update({ calificado: true })
        .eq('id', pedidoId);
      if (updateError) throw updateError;
      
      toast({ title: '¡Gracias!', description: 'Tu calificación ha sido enviada.' });
      setIsOpen(false);
      setYaCalificado(true);
      onRatingSuccess();
      
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'Ya has calificado este pedido.', variant: 'destructive' });
        setYaCalificado(true);
      } else {
        toast({ title: 'Error al enviar', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={yaCalificado}>
          {yaCalificado ? "Calificado" : "Calificar Servicio"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white text-neutral-900">
        <DialogHeader>
          <DialogTitle className="font-aventura text-2xl text-neutral-900">Califica tu Pedido</DialogTitle>
          <DialogDescription className="text-neutral-600">
            Tu opinión nos ayuda a mejorar. ¿Cómo estuvo todo?
          </DialogDescription>
        </DialogHeader>
        
        {yaCalificado ? (
          <p className="text-neutral-600 py-8 text-center">Ya has calificado este pedido. ¡Gracias!</p>
        ) : (
          <>
            <div className="py-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star className={`h-8 w-8 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="¿Algún comentario adicional? (Opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="bg-gray-100 text-neutral-900"
            />
            <DialogFooter>
              <Button variant="secondary" className="w-full" onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
                {isSubmitting ? "Enviando..." : `Enviar Calificación (${rating} Estrellas)`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----- Componente: Modal de Cumpleaños -----
function BirthdayModal({ isOpen, onClose, name, age }: { isOpen: boolean, onClose: () => void, name: string, age: number | null }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-neutral-900 overflow-hidden p-0">
        <div className="p-8 text-center space-y-4">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <Cake className="h-16 w-16 text-unemi-orange mx-auto" />
          </motion.div>
          <DialogTitle className="font-aventura text-3xl text-neutral-900">
            ¡Feliz {age ? `${age} ` : ''}Cumpleaños, {name}!
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            ¡De parte de toda la cafetería, te deseamos un día increíble! 🎈
            <br />
            Pasa por tu bebida de cortesía.
          </DialogDescription>
        </div>
        <DialogFooter className="p-4 bg-gray-50">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            ¡Muchas Gracias!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}