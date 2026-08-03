import { Navigate, useLocation, type Location } from 'react-router-dom';
import { loginConGoogle } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';

export function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;
  const redirectPath = from ? `${from.pathname}${from.search}` : '/';

  if (!loading && user) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-lg bg-background px-container-padding text-center">
      <img src="/icon-192.png" alt="AsadARG" className="h-24 w-24 rounded-2xl shadow-sm" />
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">AsadARG</h1>
        <p className="mt-2 text-on-surface-variant">
          Subsecretaría Nacional
          <br />
          de Coordinación Asadera
          <br />
          <span className="font-semibold">Delegación Pilar</span>
        </p>
      </div>
      <button
        onClick={() => loginConGoogle(redirectPath)}
        className="w-full max-w-[320px] rounded-full bg-secondary-container px-6 py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-[0px_8px_24px_rgba(116,172,223,0.25)] transition-transform active:scale-95"
      >
        Logueate, tarado
      </button>
    </div>
  );
}
