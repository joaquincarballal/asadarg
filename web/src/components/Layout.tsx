import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function Layout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-surface px-container-padding shadow-sm">
        <h1 className="font-display text-xl font-bold text-primary">{title ?? 'Asadarg'}</h1>
        <span className="material-symbols-outlined text-primary">notifications</span>
      </header>
      <main className="px-container-padding pb-28 pt-md">{children}</main>
      <BottomNav />
    </div>
  );
}
