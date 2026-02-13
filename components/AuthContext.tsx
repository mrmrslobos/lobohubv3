
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('lobo_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    // Simulated authentication
    const mockUsers: User[] = [
      { id: '1', name: 'Wolf Admin', role: UserRole.ADMIN, email: 'admin@lobo.com', color: '#3b82f6' },
      { id: '2', name: 'Alpha Parent', role: UserRole.PARENT, email: 'parent@lobo.com', color: '#ef4444' },
      { id: '3', name: 'Beta Child', role: UserRole.CHILD, email: 'child@lobo.com', color: '#10b981' }
    ];

    const found = mockUsers.find(u => u.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem('lobo_user', JSON.stringify(found));
    } else {
      throw new Error('User not found. Use admin@lobo.com, parent@lobo.com, or child@lobo.com');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lobo_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
