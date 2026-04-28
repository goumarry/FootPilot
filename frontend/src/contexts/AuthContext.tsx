import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@/types';
import { getMe } from '@/api/auth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fp_token'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('fp_token', newToken);
    localStorage.setItem('fp_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('fp_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then((u) => setUser(u))
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
