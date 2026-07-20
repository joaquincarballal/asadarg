import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', icon: 'home', label: 'Inicio', end: true },
  { to: '/asados', icon: 'outdoor_grill', label: 'Asados', end: false },
  { to: '/estadisticas', icon: 'leaderboard', label: 'Estadísticas', end: false },
  { to: '/perfil', icon: 'person', label: 'Perfil', end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-outline-variant/40 bg-surface-container-lowest px-2 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-center justify-between py-2">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `mx-auto flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant'
                }`
              }
            >
              <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
