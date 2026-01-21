import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
// NOTA: El BrowserRouter se eliminó de aquí y debe estar en tu archivo principal (main.tsx o index.tsx)
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Componente para proteger rutas (solo requiere autenticación)
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    // Usamos un layout simple de Tailwind para el mensaje de carga
    return <div className="flex justify-center items-center h-screen bg-gray-50 text-xl font-semibold">Cargando autenticación...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const App = () => {
  return (
    // Hemos eliminado el <BrowserRouter> de aquí.
    // La aplicación asume que ya está dentro de un Router en un nivel superior.
    
    <AuthProvider>
      
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        
        {/* Ruta Protegida: Todo el contenido va a Home (/) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
        </Route>
        
        {/*
          IMPORTANTE: Eliminé esta ruta de redirección:
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          Es redundante y potencialmente problemática con la ruta protegida. La lógica 
          de redirección ya está manejada por ProtectedRoute. Si ProtectedRoute determina
          que el usuario no está autenticado al intentar acceder a "/", lo enviará a "/login".
        */}
        
        {/* Ruta para cualquier otra cosa */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};

export default App;