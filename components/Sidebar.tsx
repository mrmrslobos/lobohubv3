import React from 'react';
import { useAuth } from './AuthContext';
import { IconAdmin, IconAsk, IconClose, IconHistory, IconLibrary, IconSignOut } from './icons';

export type View = 'guidance' | 'library' | 'history' | 'admin';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { id: View; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'guidance', label: 'Ask for Guidance', Icon: IconAsk },
  { id: 'library', label: 'Library', Icon: IconLibrary },
  { id: 'history', label: 'History', Icon: IconHistory },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const navItems = user?.role === 'admin' ? [...NAV_ITEMS, { id: 'admin' as const, label: 'Admin', Icon: IconAdmin }] : NAV_ITEMS;

  return (
    <>
      {isOpen && (
        <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-30 bg-black/60 md:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col bg-ink-900 shadow-2xl transition-transform duration-300 md:relative md:z-auto md:w-64 md:translate-x-0 md:shadow-none ${
          isOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center gap-3 p-6">
          <div className="overflow-hidden">
            <span className="block truncate text-xl font-semibold tracking-tight text-ink-100">Berea</span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              SDA Pastoral Guidance
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100 md:hidden"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:bg-ink-800/60 hover:text-ink-100'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" aria-hidden="true" />
                )}
                <item.Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 pt-2">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-ink-100">
                {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-ink-100">{user.displayName ?? user.email}</p>
                <p className="truncate text-xs capitalize text-ink-400">{user.role}</p>
              </div>
              <button onClick={signOut} aria-label="Sign out" className="shrink-0 text-ink-400 hover:text-ink-100">
                <IconSignOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
