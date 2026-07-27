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
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto h-full max-w-5xl">{renderView()}</div>
      </main>
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
