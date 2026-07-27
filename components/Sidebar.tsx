import React from 'react';
import { useAuth } from './AuthContext';

export type View = 'guidance' | 'library' | 'history';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'guidance', label: 'Ask for Guidance', icon: '🙏' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'history', label: 'History', icon: '🕰️' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { user, signOut } = useAuth();

  return (
    <aside className="flex w-20 flex-col border-r border-ink-600 bg-ink-950 transition-all duration-300 md:w-64">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/50 text-xl text-gold">
          📖
        </div>
        <div className="hidden md:block">
          <span className="block font-serif text-xl font-semibold tracking-tight text-ink-100">Berea</span>
          <span className="block text-[11px] text-ink-400">SDA Pastoral Guidance</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 transition-all ${
              activeView === item.id
                ? 'bg-gold-wash text-ink-100 shadow-[inset_2px_0_0_theme(colors.gold.DEFAULT)]'
                : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="hidden font-medium md:block">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="space-y-4 border-t border-ink-600 p-4">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-wash font-serif text-xs font-bold text-gold">
              {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="hidden overflow-hidden md:block">
              <p className="truncate text-sm font-semibold text-ink-100">{user.displayName ?? user.email}</p>
              <p className="truncate text-xs capitalize text-ink-400">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-4 rounded-lg px-4 py-2 text-red-400 transition-colors hover:bg-red-500/10"
        >
          <span className="text-xl">🚪</span>
          <span className="hidden text-sm font-medium md:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
