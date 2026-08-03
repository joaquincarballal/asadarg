import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-md px-container-padding text-center">
          <p className="font-display text-xl font-bold text-on-surface">Se rompió algo. 🔥</p>
          <p className="text-sm text-on-surface-variant">
            Recargá la página. Si sigue pasando, avisale a Joaquin.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-secondary-container px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-sm"
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
