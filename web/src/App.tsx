import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { Login } from './pages/Login';
import { Inicio } from './pages/Inicio';
import { Asados } from './pages/Asados';
import { CrearEvento } from './pages/CrearEvento';
import { UnirseEvento } from './pages/UnirseEvento';
import { EventoDetalle } from './pages/EventoDetalle';
import { EstadisticasGrupo } from './pages/EstadisticasGrupo';
import { Perfil } from './pages/Perfil';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Inicio />
            </AuthGuard>
          }
        />
        <Route
          path="/asados"
          element={
            <AuthGuard>
              <Asados />
            </AuthGuard>
          }
        />
        <Route
          path="/eventos/nuevo"
          element={
            <AuthGuard>
              <CrearEvento />
            </AuthGuard>
          }
        />
        <Route
          path="/eventos/:id/unirse"
          element={
            <AuthGuard>
              <UnirseEvento />
            </AuthGuard>
          }
        />
        <Route
          path="/eventos/:id"
          element={
            <AuthGuard>
              <EventoDetalle />
            </AuthGuard>
          }
        />
        <Route
          path="/estadisticas"
          element={
            <AuthGuard>
              <EstadisticasGrupo />
            </AuthGuard>
          }
        />
        <Route
          path="/perfil"
          element={
            <AuthGuard>
              <Perfil />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
