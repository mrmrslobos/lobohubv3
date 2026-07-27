import React from 'react';
import { useAuth } from './AuthContext';

export type View = 'guidance' | 'library' | 'history' | 'admin';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'guidance', label: 'Ask for Guidance', icon: '🙏' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'history', label: 'History', icon: '🕰️' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const navItems = user?.role === 'admin' ? [...NAV_ITEMS, { id: 'admin' as const, label: 'Admin', icon: '🛠️' }] : NAV_ITEMS;

  return (
    <>
      {isOpen && (
        <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-30 bg-black/50 md:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-ink-600 bg-ink-950 transition-transform duration-300 md:relative md:z-auto md:w-64 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gold/50 text-xl text-gold">
            📖
          </div>
          <div className="overflow-hidden">
            <span className="block truncate font-serif text-xl font-semibold tracking-tight text-ink-100">
              Berea
            </span>
            <span className="block truncate text-[11px] text-ink-400">SDA Pastoral Guidance</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100 md:hidden"
          >
            <span className="block text-lg leading-none">✕</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                onClose();
              }}
              className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 transition-all ${
                activeView === item.id
                  ? 'bg-gold-wash text-ink-100 shadow-[inset_2px_0_0_theme(colors.gold.DEFAULT)]'
                  : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-4 border-t border-ink-600 p-4">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-wash font-serif text-xs font-bold text-gold">
                {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
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
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
