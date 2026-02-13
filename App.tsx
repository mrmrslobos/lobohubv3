
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Tasks from './components/Tasks';
import ShoppingList from './components/ShoppingList';
import Budget from './components/Budget';
import Auth from './components/Auth';
import { AppState, User, UserRole, TaskPriority } from './types';

// Initial Mock Data
const INITIAL_DATA: AppState = {
  currentUser: null,
  users: [
    { id: '1', name: 'Wolf Admin', role: UserRole.ADMIN, email: 'admin@lobo.com', color: '#3b82f6' },
    { id: '2', name: 'Alpha Parent', role: UserRole.PARENT, email: 'parent@lobo.com', color: '#ef4444' },
    { id: '3', name: 'Beta Child', role: UserRole.CHILD, email: 'child@lobo.com', color: '#10b981' }
  ],
  events: [
    { id: 'e1', title: 'Weekly Pack Meeting', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString(), assignedTo: ['1', '2', '3'], category: 'Family' }
  ],
  tasks: [
    { id: 't1', title: 'Fix the Den Fence', priority: TaskPriority.HIGH, assignedTo: '1', completed: false, createdBy: '2' },
    { id: 't2', title: 'Math Homework', priority: TaskPriority.MEDIUM, assignedTo: '3', completed: false, createdBy: '2' }
  ],
  shoppingItems: [
    { id: 's1', name: 'Meat', quantity: '2kg', category: 'Meat', purchased: false, requestedBy: '2' }
  ],
  transactions: [
    { id: 'tr1', description: 'Monthly Salary', amount: 5000, type: 'INCOME', category: 'Salary', date: new Date().toISOString(), userId: '1' },
    { id: 'tr2', description: 'Groceries', amount: 200, type: 'EXPENSE', category: 'Groceries', date: new Date().toISOString(), userId: '2' }
  ]
};

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'dashboard' | 'calendar' | 'tasks' | 'shopping' | 'budget'>('dashboard');
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('lobo_app_state');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  useEffect(() => {
    localStorage.setItem('lobo_app_state', JSON.stringify(appState));
  }, [appState]);

  if (!user) return <Auth />;

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard state={appState} setState={setAppState} />;
      case 'calendar': return <Calendar state={appState} setState={setAppState} />;
      case 'tasks': return <Tasks state={appState} setState={setAppState} />;
      case 'shopping': return <ShoppingList state={appState} setState={setAppState} />;
      case 'budget': return <Budget state={appState} setState={setAppState} />;
      default: return <Dashboard state={appState} setState={setAppState} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar activeView={view} onViewChange={setView} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
          {renderView()}
        </div>
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
