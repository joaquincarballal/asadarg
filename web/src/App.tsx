import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Inicio = lazy(() => import('./pages/Inicio').then((m) => ({ default: m.Inicio })));
const Asados = lazy(() => import('./pages/Asados').then((m) => ({ default: m.Asados })));
const CrearEvento = lazy(() =>
  import('./pages/CrearEvento').then((m) => ({ default: m.CrearEvento })),
);
const UnirseEvento = lazy(() =>
  import('./pages/UnirseEvento').then((m) => ({ default: m.UnirseEvento })),
);
const EventoDetalle = lazy(() =>
  import('./pages/EventoDetalle').then((m) => ({ default: m.EventoDetalle })),
);
const EstadisticasGrupo = lazy(() =>
  import('./pages/EstadisticasGrupo').then((m) => ({ default: m.EstadisticasGrupo })),
);
const Perfil = lazy(() => import('./pages/Perfil').then((m) => ({ default: m.Perfil })));

function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-on-surface-variant">
      Prendiendo el fuego...
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Cargando />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
