import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import Sidebar, { type View } from './components/Sidebar';
import Auth from './components/Auth';
import GuidanceChat from './components/GuidanceChat';
import Library from './components/Library';
import History from './components/History';
import Admin from './components/Admin';
import { IconMenu } from './components/icons';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('guidance');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950 text-ink-400">
        Loading Berea…
      </div>
    );
  }

  if (!user) return <Auth />;

  const goToConversation = (id: string) => {
    setConversationId(id);
    setView('guidance');
  };

  const renderView = () => {
    switch (view) {
      case 'guidance':
        return (
          <GuidanceChat
            conversationId={conversationId}
            onConversationStarted={(id) => setConversationId(id)}
          />
        );
      case 'library':
        return <Library />;
      case 'history':
        return <History onSelect={goToConversation} />;
      case 'admin':
        return user.role === 'admin' ? <Admin /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-ink-200">
      <Sidebar
        activeView={view}
        onViewChange={(v) => {
          if (v === 'guidance' && view !== 'guidance') setConversationId(null);
          setView(v);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-hair px-3 py-2.5 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1 text-ink-200 hover:bg-ink-800"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-ink-100">Berea</span>
        </div>
        {/* Guidance runs its own full-height two-pane layout; the rest scroll in a measured column. */}
        <main className="min-h-0 flex-1 overflow-hidden">
          {view === 'guidance' ? (
            renderView()
          ) : (
            <div className="h-full overflow-y-auto px-5 py-6">
              <div className="mx-auto max-w-5xl">{renderView()}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;
