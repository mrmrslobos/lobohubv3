import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import Sidebar, { type View } from './components/Sidebar';
import Auth from './components/Auth';
import GuidanceChat from './components/GuidanceChat';
import Library from './components/Library';
import History from './components/History';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('guidance');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-900 text-ink-400">
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
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900 text-ink-200">
      <Sidebar
        activeView={view}
        onViewChange={(v) => {
          if (v === 'guidance' && view !== 'guidance') setConversationId(null);
          setView(v);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-ink-600 bg-ink-950 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-ink-200 hover:bg-ink-800"
          >
            <span className="block text-xl leading-none">☰</span>
          </button>
          <span className="font-serif text-lg font-semibold text-ink-100">Berea</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto h-full max-w-5xl">{renderView()}</div>
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
