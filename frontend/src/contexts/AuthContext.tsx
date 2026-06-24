import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react';
import { apiClient } from '@/services/api';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const TOKEN_KEY = 'auth-token';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 起動時にトークン検証
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }

    apiClient.get<{ success: true; data: AuthUser }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setUser(res.data.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ success: true; data: { token: string; user: AuthUser } }>(
      '/auth/login', { email, password }
    );
    const { token, user: u } = res.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const loginWithToken = useCallback((token: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin: user?.role === 'admin', login, loginWithToken, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
