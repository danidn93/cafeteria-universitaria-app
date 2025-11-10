// client/src/pages/NotFound.tsx
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div>
      <h1>404 - Página No Encontrada</h1>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}