import { Navigate } from 'react-router-dom';
import { loginConGoogle } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';

export function Login() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-lg bg-background px-container-padding text-center">
      <span className="material-symbols-outlined text-[64px] text-primary">outdoor_grill</span>
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Asadarg</h1>
        <p className="mt-2 text-on-surface-variant">
          Che, entrá con tu cuenta de Google para arrancar a repartir gastos de asado.
        </p>
      </div>
      <button
        onClick={() => loginConGoogle()}
        className="w-full max-w-xs rounded-full bg-secondary-container px-6 py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-[0px_8px_24px_rgba(116,172,223,0.25)] transition-transform active:scale-95"
      >
        Entrar con Google
      </button>
    </div>
  );
}
