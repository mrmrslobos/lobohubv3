import React from 'react';
import { useAuth } from './AuthContext';
import { useLibraryStats } from '../lib/libraryStats';
import { IconAdmin, IconAsk, IconClose, IconHistory, IconLibrary, IconSearch, IconSignOut } from './icons';

export type View = 'guidance' | 'library' | 'history' | 'admin';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { id: View; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'guidance', label: 'Guidance', Icon: IconAsk },
  { id: 'library', label: 'Library', Icon: IconLibrary },
  { id: 'history', label: 'History', Icon: IconHistory },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const stats = useLibraryStats();
  const navItems =
    user?.role === 'admin' ? [...NAV_ITEMS, { id: 'admin' as const, label: 'Admin', Icon: IconAdmin }] : NAV_ITEMS;

  const percent = stats && stats.total > 0 ? Math.round((stats.ready / stats.total) * 100) : 0;

  return (
    <>
      {isOpen && (
        <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-30 bg-black/60 md:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col gap-5 border-r border-hair bg-ink-900 p-3 transition-transform duration-200 md:relative md:z-auto md:w-[218px] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 px-1.5 pt-1">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[11px] font-bold text-accent-on">
            B
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink-100">Berea</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-100 md:hidden"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-hair bg-ink-950 px-2.5 py-1.5 text-[13px] text-ink-500">
          <IconSearch className="h-4 w-4" />
          <span>Search</span>
          <kbd className="ml-auto rounded border border-hair bg-ink-800 px-1.5 py-0.5 font-sans text-[10px] text-ink-400">
            ⌘K
          </kbd>
        </div>

        <div>
          <p className="mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500">Workspace</p>
          <nav className="flex flex-col gap-px">
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    onClose();
                  }}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors ${
                    active ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:bg-ink-800/60 hover:text-ink-100'
                  }`}
                >
                  <item.Icon className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : ''}`} />
                  <span>{item.label}</span>
                  {item.id === 'library' && stats && (
                    <span className="ml-auto text-[11px] tabular-nums text-ink-500">{stats.total}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {stats && stats.total > 0 && (
          <div className="mt-auto rounded-lg border border-hair bg-ink-950 p-2.5">
            <div className="flex items-baseline justify-between text-[11px] text-ink-400">
              <span>Library indexed</span>
              <b className="text-[12px] font-semibold tabular-nums text-ink-100">
                {stats.ready}/{stats.total}
              </b>
            </div>
            <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-ink-800">
              <span className="block h-full rounded-full bg-good" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {user && (
          <div className={`flex items-center gap-2 px-1.5 pb-1 ${stats && stats.total > 0 ? '' : 'mt-auto'}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hair bg-ink-800 text-[10px] font-semibold text-ink-100">
              {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-[12px] font-medium text-ink-100">
                {user.displayName ?? user.email}
              </span>
              <span className="block truncate text-[11px] capitalize text-ink-500">{user.role}</span>
            </span>
            <button onClick={signOut} aria-label="Sign out" className="shrink-0 text-ink-500 hover:text-ink-100">
              <IconSignOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
