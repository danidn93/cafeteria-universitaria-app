// client/src/pages/Home.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import type { SessionUser } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';

// --- Tus Imágenes de Fondo y Logo ---
import adminBgDesktop from '/assets/admin-bg-ordinario.png';
import adminBgMobile from '/assets/movil-bg-ordinario.png';
import logo from '/assets/logo-admin-ordinario.png';

// --- Componentes de UI ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; 
import { toast } from '@/components/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Settings, RefreshCw } from "lucide-react";

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

interface Cafeteria {
  id: string;
  nombre_local: string;
}

const getHorarioHoy = (horarioArr: string[]): string => {
  const dayIndex = new Date().getDay();
  const todayIndex = (dayIndex + 6) % 7;
  return horarioArr[todayIndex] || "Horario no disponible";
};

// ✨ Tipo para el motivo del bloqueo
type BlockReasonCode = "TIME_LOCK" | "RATING_LOCK";

export default function Home() {
  const { user, logout, refreshUser } = useAuth();
  
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

  const cafeteriaIds = useMemo(() => user?.cafeteria_ids ?? [], [user]);
  const [cafeteriaActivaId, setCafeteriaActivaId] = useState<string | null>(null);

  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);

  const [activeTab, setActiveTab] = useState<'menu' | 'pedidos'>('menu');

  // --- Efectos de Fondo ---
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const applyBg = () => setBgUrl(mq.matches ? adminBgDesktop : adminBgMobile);
    applyBg();
    mq.addEventListener('change', applyBg);
    return () => mq.removeEventListener('change', applyBg);
  }, []);

  useEffect(() => {
    if (!user) return;

    if (cafeteriaIds.length === 1) {
      setCafeteriaActivaId(cafeteriaIds[0]);
    } else {
      setCafeteriaActivaId(null);
    }
  }, [user, cafeteriaIds]);

  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      setMinH(`${h}px`);
    };
    setVh();
    window.visualViewport?.addEventListener('resize', setVh);
    return () => window.visualViewport?.removeEventListener('resize', setVh);
  }, []);

  ////////////////////////////////////////////////////////////////////////////////////////
  //                       🎂🎂  LÓGICA REAL DEL CUMPLEAÑOS  🎂🎂
  ////////////////////////////////////////////////////////////////////////////////////////
  const checkBirthday = (birthDate: string) => {
    try {
      if (!birthDate) return;

      // Convertir "YYYY-MM-DD" a fecha local REAL
      const [year, month, day] = birthDate.split("-").map(Number);
      const birth = new Date(year, month - 1, day); // ← LOCAL, no UTC

      const today = new Date();
      
      const todayKey = today.toDateString();
      const shownToday = localStorage.getItem("birthdayModalShown");

      if (shownToday === todayKey) return;

      const isSameMonth = today.getMonth() === birth.getMonth();
      const isSameDay = today.getDate() === birth.getDate();

      if (isSameMonth && isSameDay) {
        setShowBirthdayModal(true);

        // Calcular edad real sin desfases de zona horaria
        let age = today.getFullYear() - birth.getFullYear();
        const hasNotHadBirthday =
          today.getMonth() < birth.getMonth() ||
          (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());

        if (hasNotHadBirthday) age--;

        setUserAge(age);
        localStorage.setItem("birthdayModalShown", todayKey);
      }

    } catch (e) {
      console.error("Error parsing birth date", e);
    }
  };

  useEffect(() => {
    if (!user?.fecha_nacimiento) return;

    // Primera verificación inmediata
    checkBirthday(user.fecha_nacimiento);

    // Verifica cada minuto
    const interval = setInterval(() => {
      if (!user?.fecha_nacimiento) return;
      checkBirthday(user.fecha_nacimiento);
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  // --- Funciones de Fetch ---
  const fetchConfig = async () => {
    if (!cafeteriaActivaId) return;

    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', cafeteriaActivaId)
      .single();

    if (data) setConfig(data);
    if (error) console.error('Error fetching config:', error.message);
  };

  const fetchCafeterias = async () => {
    if (!user || cafeteriaIds.length === 0) {
      setCafeterias([]);
      return;
    }

    const { data, error } = await supabase
      .from('configuracion')
      .select('id, nombre_local')
      .in('id', cafeteriaIds)
      .order('nombre_local');

    if (error) {
      console.error('Error fetching cafeterias:', error.message);
      setCafeterias([]);
      return;
    }

    setCafeterias(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    fetchCafeterias();
  }, [user, cafeteriaIds]);

  const fetchMenu = async () => {
    if (!cafeteriaActivaId) return;

    setLoadingItems(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('cafeteria_id', cafeteriaActivaId);

    if (data) setItems(data);
    if (error) console.error('Error fetching items:', error.message);
    setLoadingItems(false);
  };

  const fetchPedidos = async () => {
    if (!user || !cafeteriaActivaId) return;

    const { data, error } = await supabase
      .from('pedidos_pwa')
      .select(`
        id, estado, created_at, updated_at, calificado,
        items:pedido_pwa_items ( item_nombre, cantidad )
      `)
      .eq('user_id', user.id)
      .eq('cafeteria_id', cafeteriaActivaId)
      .order('updated_at', { ascending: false });

    if (error) return;

    const normalized = [...(data ?? [])];

    const activos = normalized.filter(p =>
      ['pendiente', 'preparando', 'listo'].includes(p.estado)
    );

    const historial = normalized.filter(p => p.estado === 'entregado');

    setPedidosActivos(activos);
    setPedidosHistorial(historial);

    // 🔥 Si ya no hay activos y hay historial → ir a "Mis Pedidos"
    if (activos.length === 0 && historial.length > 0) {
      setActiveTab('pedidos');
    }
  };

  useEffect(() => {
    if (!user || !cafeteriaActivaId) return;

    const channel = supabase
      .channel(`pedidos-home-${user.id}-${cafeteriaActivaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos_pwa',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchPedidos()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos_pwa',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchPedidos()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pedidos_pwa',
        },
        () => fetchPedidos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, cafeteriaActivaId]);

  useEffect(() => {
    if (!cafeteriaActivaId) return;

    fetchConfig();
    fetchMenu();
    fetchPedidos();
    fetchUserRanking();
  }, [cafeteriaActivaId]);

  const fetchUserRanking = async () => {
    if (!user) return;
    setLoadingRanking(true);

    const { data, error } = await supabase.rpc('get_user_last_month_rank', {
      p_user_id: user.id 
    });

    if (error) {
      console.error('Error fetching ranking:', error.message);
      setRanking(null);
    } else {
      setRanking(data); 
    }
    
    setLoadingRanking(false);
  };

  // --- Efectos de carga inicial ---
  useEffect(() => {
    if (!user) {
      setLoadingItems(false);
      setLoadingPedidos(false);
      return;
    }

    fetchConfig();
    fetchMenu();
    fetchUserRanking();

  }, [user]);

  useEffect(() => {
    if (!user || !cafeteriaActivaId) return;

    const loadInitialPedidos = async () => {
      try {
        setLoadingPedidos(true);
        await fetchPedidos();
      } catch (error) {
        console.error("Error en la carga inicial de pedidos:", error);
      } finally {
        setLoadingPedidos(false);
      }
    };

    loadInitialPedidos();
  }, [user?.id, cafeteriaActivaId]);


  // --- Lógica de bloqueo ---
  useEffect(() => {
    if (loadingPedidos) return;

    const lastActive = pedidosActivos[0];
    const lastHistorical = pedidosHistorial[0];
    let mostRecentOrder: Pedido | null = null;

    if (lastActive && lastHistorical) {
      mostRecentOrder = new Date(lastActive.created_at) > new Date(lastHistorical.created_at)
        ? lastActive
        : lastHistorical;
    } else {
      mostRecentOrder = lastActive || lastHistorical || null;
    }

    if (mostRecentOrder) {
      const lastOrderTime = new Date(mostRecentOrder.created_at);
      const expirationTime = new Date(lastOrderTime.getTime() + 60 * 60 * 1000);
      
      if (expirationTime.getTime() > Date.now()) {
        setBlockReason("TIME_LOCK");
        setBlockExpiresAt(expirationTime);
        return;
      }
    }

    const lastDeliveredOrder = pedidosHistorial[0];
    if (lastDeliveredOrder && !lastDeliveredOrder.calificado) {
      setBlockReason("RATING_LOCK");
      setBlockExpiresAt(null);
      return;
    }

    setBlockReason(null);
    setBlockExpiresAt(null);

  }, [pedidosActivos, pedidosHistorial, loadingPedidos]);

  useEffect(() => {
    const updateCountdown = () => {
      if (blockReason === "TIME_LOCK" && blockExpiresAt) {
        const diff = blockExpiresAt.getTime() - Date.now();
        
        if (diff <= 0) {
          setBlockExpiresAt(null);
          setBlockReason(null);
          setCountdownDisplay(null);
        } else {
          const minutesLeft = Math.ceil(diff / (1000 * 60));
          setCountdownDisplay(`Próximo pedido en ${minutesLeft} min.`);
        }
      } else if (blockReason === "RATING_LOCK") {
        setCountdownDisplay("Debes calificar tu último pedido para pedir de nuevo.");
      } else {
        setCountdownDisplay(null);
      }
    };

    updateCountdown();

    const intervalId = setInterval(updateCountdown, 10000);

    return () => clearInterval(intervalId);

  }, [blockReason, blockExpiresAt]);

  // --- Estados derivados finales ---
  const isOrderBlocked = !!blockReason;
  const finalBlockReason = blockReason === "RATING_LOCK" 
    ? "Debes calificar tu último pedido. (Ver en 'Mis Pedidos')" 
    : countdownDisplay;

  // --- Lógica para actualizar el carrito ---
  const handleUpdateQuantity = (item: Item, action: 'inc' | 'dec') => {
    
    if (action === 'dec') {
      setOrder([]);
      return;
    }

    if (!cafeteriaActivaId) {
      toast({
        title: 'Selecciona cafetería',
        description: 'Debes elegir una cafetería antes de realizar un pedido.',
        variant: 'destructive',
      });
      return;
    }

    if (action === 'inc') {
      
      if (isOrderBlocked) {
         toast({
            title: 'Pedido bloqueado',
            description: finalBlockReason,
            variant: 'destructive',
         });
         return;
      }

      if (order.length > 0) {
        toast({
            title: 'Límite de productos alcanzado',
            description: 'Solo puedes seleccionar un producto a la vez.',
            variant: 'destructive',
        });
        return;
      }

      setOrder([{ ...item, quantity: 1 }]);
      
      if (!isSheetOpen) {
        setIsSheetOpen(true);
      }
    }
  };

  const handleSubmitOrder = async () => {

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
      const { data: pedidoData, error: pedidoError } =
        await supabase
          .from('pedidos_pwa')
          .insert({
            user_id: user.id,
            cafeteria_id: cafeteriaActivaId,
            estado: 'pendiente'
          })
          .select('id')
          .single();

      if (pedidoError || !pedidoData) throw pedidoError;

      const newPedidoId = pedidoData.id;

      const itemsToInsert = order.map(item => ({
        pedido_pwa_id: newPedidoId,
        item_id: item.id,
        cantidad: item.quantity,
        item_nombre: item.nombre
      }));

      const { error: itemsError } =
        await supabase.from('pedido_pwa_items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({ title: '¡Pedido Confirmado!', description: 'Muchas Gracias.' });
      setOrder([]);
      setIsSheetOpen(false);
      fetchPedidos();

    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({
        title: 'Error al enviar el pedido',
        description: error.message,
        variant: 'destructive'
      });
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

  return (
    <div className="unemi text-white relative pb-24" style={{ minHeight: minH }}>
      
      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-no-repeat bg-center bg-cover"
          style={{ backgroundImage: `url(${bgUrl})` }} />
        <div className="absolute inset-0 bg-[hsl(200_100%_13.5%/_0.88)]" />
      </div>
      
      <header className="p-4 flex justify-between items-start">
        <div>
            <h1 className="text-xl font-bold">Hola, {user && (user.name?.split(' ')[0] || 'Empleado')}</h1>
            <p className="text-white opacity-90">
              {config?.nombre_local || "Cafetería Universitaria"}
            </p>
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
            {/* Mostrar selector solo si el usuario tiene más de una cafetería */}
            {cafeterias.length > 1 && (
              <Select
                value={cafeteriaActivaId ?? ""}
                onValueChange={(value) => setCafeteriaActivaId(value)}
              >
                <SelectTrigger className="w-full bg-white text-black border border-gray-300">
                  <SelectValue placeholder="Selecciona cafetería" />
                </SelectTrigger>

                <SelectContent className="bg-white text-neutral-900 border border-gray-200">
                  {cafeterias.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="cursor-pointer focus:bg-gray-100 focus:text-neutral-900"
                    >
                      {c.nombre_local}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>

        <div className="flex items-center gap-2">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-10 w-10 rounded-full border-2 border-unemi-orange bg-white object-contain" 
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="bg-white text-neutral-900">
            <SheetHeader>
              <SheetTitle>Opciones</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-3">
              <UpdateProfileDialog
                user={user}
                triggerAsRow
                onUpdated={async () => {
                  await refreshUser();
                }}
              />

              <ChangePasswordDialog user={user} triggerAsRow />

              <SugerenciasDialog
                user={user}
                cafeteriaId={cafeteriaActivaId}
                triggerAsRow
              />

              <SheetActionRow
                icon={<LogOut className="h-4 w-4" />}
                label="Cerrar sesión"
                variant="destructive"
                onClick={logout}
              />
            </div>
          </SheetContent>
        </Sheet>

      </header>
      
      <BirthdayModal 
        isOpen={showBirthdayModal} 
        onClose={() => setShowBirthdayModal(false)} 
        name={user?.name?.split(' ')[0] || 'Empleado'} 
        age={userAge}
      />

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
            <TabsTrigger value="menu"
              className="data-[state=active]:bg-unemi-orange data-[state=active]:text-white text-white">
              Menú
            </TabsTrigger>
            <TabsTrigger value="pedidos"
              className="data-[state=active]:bg-unemi-orange data-[state=active]:text-white text-white">
              Mis Pedidos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="menu">
            <RankingWidget loading={loadingRanking} ranking={ranking} />

            <OrderLockWidget
              loading={loadingPedidos}
              isBlocked={isOrderBlocked}
              reason={finalBlockReason}
            />

            <PedidosActivosWidget loading={loadingPedidos} activos={pedidosActivos} />
            
            {loadingItems ? (
              <div className="text-center py-10">
                <Coffee className="h-12 w-12 mx-auto animate-pulse text-white/70" />
                <p className="text-white/70 mt-2">Cargando menú...</p>
              </div>
            ) : (
              <>
                {itemsPorCategoria.cafes.length > 0 && (
                  <>
                    <h2 className="font-aventura text-2xl font-bold mt-6 mb-4 text-orange-400 flex items-center gap-2">
                      <Coffee /> Cafés
                    </h2>
                    <ProductGrid items={itemsPorCategoria.cafes} onUpdateQuantity={handleUpdateQuantity} order={order} />
                  </>
                )}

                {itemsPorCategoria.bebidas.length > 0 && (
                  <>
                    <h2 className="font-aventura text-2xl font-bold mt-8 mb-4 text-orange-400">
                      Nuestras Bebidas
                    </h2>
                    <ProductGrid items={itemsPorCategoria.bebidas} onUpdateQuantity={handleUpdateQuantity} order={order} />
                  </>
                )}

                {itemsPorCategoria.snacks.length > 0 && (
                  <>
                    <h2 className="font-aventura text-2xl font-bold mt-8 mb-4 text-orange-400">
                      Snacks
                    </h2>
                    <ProductGrid items={itemsPorCategoria.snacks} onUpdateQuantity={handleUpdateQuantity} order={order} />
                  </>
                )}

                {itemsPorCategoria.noDisponibles.length > 0 && (
                  <>
                    <h2 className="font-aventura text-2xl font-bold mt-8 mb-4 text-white/70">
                      No Disponibles
                    </h2>
                    <ProductGrid
                      items={itemsPorCategoria.noDisponibles}
                      onUpdateQuantity={() => {}}
                      order={order}
                      disabled={true}
                    />
                  </>
                )}

                {items.length === 0 && !loadingItems && (
                  <div className="text-center py-10">
                    <p className="text-white/70">No hay items en el menú.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="pedidos">
            <PedidosHistorialList 
              user={user} 
              cafeteriaId={cafeteriaActivaId}
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
            <motion.div initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-4 right-4 z-50">
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
            <SheetDescription className="text-neutral-600">
              Confirma tu selección. Es cortesía de la casa.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-4 space-y-4">
            {order.length === 0 ? (
              <p className="text-neutral-500">Aún no has seleccionado nada.</p>
            ) : (
              order.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-neutral-900">{item.nombre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(item, 'dec')}>
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-neutral-900">
                      {item.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <SheetFooter className="flex flex-col gap-2">
            <Button 
              type="submit" 
              variant="secondary" 
              className="w-full" 
              disabled={isSubmitting || order.length === 0 || isOrderBlocked}
              onClick={handleSubmitOrder}
            >
              {isSubmitting 
                ? 'Confirmando...' 
                : (isOrderBlocked ? 'Pedido Bloqueado' : 'Confirmar Pedido')}
            </Button>
            
            {isOrderBlocked && order.length > 0 && (
              <p className="text-sm text-red-600 text-center">{finalBlockReason}</p>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}


// ----------------------------------------------------------
// WIDGETS Y COMPONENTES AUXILIARES
// ----------------------------------------------------------

function OrderLockWidget({ loading, isBlocked, reason }: { loading: boolean, isBlocked: boolean, reason: string | null }) {
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

function RankingWidget({ loading, ranking }: { loading: boolean, ranking: number | null }) {
  if (loading)
    return (
      <div className="text-center py-6">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-white/70" />
        <p className="text-white/70 mt-2">Cargando tu ranking...</p>
      </div>
    );

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
      <div
        className="absolute -top-2 -right-2 bg-yellow-300 w-16 h-16 transform rotate-45"
        style={{ filter: 'opacity(0.5)' }}
      ></div>
    </div>
  );
}

function SheetActionRow({
  icon,
  label,
  onClick,
  variant = "outline",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "outline" | "destructive";
}) {
  return (
    <Button
      variant={variant}
      className="w-full justify-start gap-2"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

function ChangePasswordDialog({
  user,
  triggerAsRow = false,
}: {
  user: SessionUser | null;
  triggerAsRow?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!newPassword || !confirmPassword) {
      toast({ title: 'Campos vacíos', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.rpc('update_user_password', {
      p_user_id: user.id,
      p_new_password: newPassword
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contraseña actualizada' });
      setIsOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerAsRow ? (
          <Button variant="outline" className="w-full justify-start gap-2">
            <KeyRound className="h-4 w-4" />
            Cambiar contraseña
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <KeyRound className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-white text-neutral-900">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
        </DialogHeader>

        <Input
          type="password"
          placeholder="Nueva contraseña"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Repetir contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Actualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateProfileDialog({
  user,
  triggerAsRow = false,
  onUpdated,
}: {
  user: SessionUser | null;
  triggerAsRow?: boolean;
  onUpdated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(
    user?.fecha_nacimiento ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPhone(user?.phone ?? "");
    setFechaNacimiento(user?.fecha_nacimiento ?? "");
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    if (!phone.trim() || !fechaNacimiento) {
      toast({
        title: "Campos incompletos",
        description: "Teléfono y fecha de nacimiento son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("app_users")
      .update({
        phone: phone.trim(),
        fecha_nacimiento: fechaNacimiento,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Datos actualizados correctamente" });
      setIsOpen(false);
      onUpdated?.();
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerAsRow ? (
          <Button variant="outline" className="w-full justify-start gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar datos
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-white text-neutral-900">
        <DialogHeader>
          <DialogTitle>Actualizar datos personales</DialogTitle>
          <DialogDescription>
            Mantén tu información actualizada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Teléfono</label>
            <Input
              type="tel"
              placeholder="Ej: 0991234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Fecha de nacimiento</label>
            <Input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductGrid({
  items,
  onUpdateQuantity,
  order,
  disabled = false
}: {
  items: Item[];
  onUpdateQuantity: (item: Item, action: 'inc' | 'dec') => void;
  order: OrderItem[];
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map(item => {
        const itemInOrder = order.find(i => i.id === item.id);
        const quantity = itemInOrder?.quantity || 0;

        return (
          <Card key={item.id}
            className={`dashboard-card flex flex-col justify-between ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            
            <CardHeader className="p-0">
              <img
                src={item.image_url || 'https://placehold.co/600x400/002E45/FF6900?text=Café'}
                alt={item.nombre}
                className="rounded-t-lg aspect-video object-cover"
              />
            </CardHeader>

            <CardContent className="p-4 flex-grow">
              <CardTitle className="font-aventura text-lg">{item.nombre}</CardTitle>
              <CardDescription className="text-sm mt-1 opacity-80">
                {item.description}
              </CardDescription>
            </CardContent>

            <div className="p-4 pt-0">
              {quantity === 0 ? (
                <Button 
                  className="w-full" 
                  variant="secondary" 
                  onClick={() => onUpdateQuantity(item, 'inc')}
                  disabled={disabled}
                >
                  Seleccionar
                </Button>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => onUpdateQuantity(item, 'dec')}>
                    <MinusCircle className="h-5 w-5" />
                  </Button>

                  <span className="w-10 text-center text-xl font-bold">
                    {quantity}
                  </span>
                </div>
              )}
            </div>

          </Card>
        );
      })}
    </div>
  );
}

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
    if (estado === 'pendiente')
      return { text: 'Pedido Recibido', icon: <Loader2 className="h-4 w-4 animate-spin text-yellow-400" /> };
    if (estado === 'preparando')
      return { text: 'Preparando ☕', icon: <Coffee className="h-4 w-4 text-blue-400" /> };
    if (estado === 'listo')
      return { text: '¡Listo para retirar! 🍶', icon: <ShoppingBag className="h-4 w-4 text-green-400" /> };
    return { text: 'Desconocido', icon: <></> };
  };

  return (
    <div className="space-y-4 mt-6 mb-8">
      <h3 className="font-aventura text-xl font-bold text-white">Tu Pedido en Curso</h3>

      {activos.map(pedido => {
        const status = getStatusInfo(pedido.estado);

        return (
          <Card key={pedido.id} className="dashboard-card border-l-4 border-unemi-orange">
            <CardHeader>
              <CardTitle className="font-aventura text-lg flex justify-between items-center text-white">
                <span className="flex items-center gap-2">
                  {status.icon}
                  {status.text}
                </span>
              </CardTitle>
              <CardDescription className="text-white/70">
                Realizado {new Date(pedido.created_at).toLocaleString('es-EC', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="list-disc pl-5 text-white/70 text-sm">
                {pedido.items.map((item, idx) => (
                  <li key={idx}>{item.cantidad}x {item.item_nombre}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PedidosHistorialList({
  user,
  cafeteriaId,
  loading,
  historial,
  onRatingSuccess
}: {
  user: SessionUser | null;
  cafeteriaId: string | null;
  loading: boolean;
  historial: Pedido[];
  onRatingSuccess: () => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-10">
        <History className="h-12 w-12 mx-auto animate-spin text-white/70" />
        <p className="text-white/70 mt-2">Cargando historial...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 mt-6">
      <div>
        <h3 className="font-aventura text-xl font-bold mb-4 text-white">
          Historial de Pedidos
        </h3>

        {historial.length === 0 && (
          <p className="text-white/70">Aún no tienes historial de pedidos.</p>
        )}

        <div className="space-y-4">
          {historial.map(pedido => (
            <Card key={pedido.id} className="dashboard-card opacity-70">
              <CardHeader>
                <CardTitle className="font-aventura text-white/70">Entregado</CardTitle>
                <CardDescription className="text-white/70">
                  Pedido del {new Date(pedido.created_at).toLocaleString('es-EC', {
                    day: '2-digit',
                    month: 'long'
                  })}
                </CardDescription>
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
                  cafeteriaId={cafeteriaId}
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

function SugerenciasDialog({
  user,
  cafeteriaId,
  triggerAsRow = false,
}: {
  user: SessionUser | null;
  cafeteriaId: string | null;
  triggerAsRow?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !mensaje.trim() || !cafeteriaId) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('sugerencias_pwa')
      .insert({
        user_id: user.id,
        cafeteria_id: cafeteriaId,
        mensaje: mensaje.trim(),
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gracias por tu sugerencia' });
      setMensaje("");
      setIsOpen(false);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerAsRow ? (
          <Button variant="outline" className="w-full justify-start gap-2">
            <MessageSquare className="h-4 w-4" />
            Enviar sugerencia
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-white text-neutral-900">
        <DialogHeader>
          <DialogTitle>Sugerencias</DialogTitle>
        </DialogHeader>

        <Textarea
          placeholder="Escribe tu comentario..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !mensaje.trim()}>
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingDialog({
  user,
  pedidoId,
  cafeteriaId,
  initialCalificado,
  onRatingSuccess
}: {
  user: SessionUser | null;
  pedidoId: string;
  cafeteriaId: string | null;
  initialCalificado: boolean;
  onRatingSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yaCalificado, setYaCalificado] = useState(initialCalificado);

  useEffect(() => setYaCalificado(initialCalificado), [initialCalificado]);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);

    try {
      const { error: ratingError } =
        await supabase.from('calificaciones_pwa').insert({
          user_id: user.id,
          pedido_id: pedidoId,
          cafeteria_id: cafeteriaId,
          estrellas: rating,
          comentario: comentario.trim()
        });

      if (ratingError) throw ratingError;

      const { error: updateError } =
        await supabase
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
        toast({
          title: 'Error',
          description: 'Ya has calificado este pedido.',
          variant: 'destructive'
        });
        setYaCalificado(true);
      } else {
        toast({
          title: 'Error al enviar',
          description: error.message,
          variant: 'destructive'
        });
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
          <DialogTitle className="font-aventura text-2xl text-neutral-900">
            Califica tu Pedido
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            Tu opinión nos ayuda a mejorar.
          </DialogDescription>
        </DialogHeader>

        {yaCalificado ? (
          <p className="text-neutral-600 py-8 text-center">
            Ya has calificado este pedido. ¡Gracias!
          </p>
        ) : (
          <>
            <div className="py-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star
                    className={`h-8 w-8 ${
                      rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                  />
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
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? "Enviando..." : `Enviar Calificación (${rating} Estrellas)`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BirthdayModal({
  isOpen,
  onClose,
  name,
  age
}: {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  age: number | null;
}) {
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
