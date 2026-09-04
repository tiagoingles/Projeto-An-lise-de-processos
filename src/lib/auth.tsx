import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'admin' | 'member';
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ user: AuthUser }>('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setError(null);
    try {
      const data = await api.post<{ user: AuthUser }>('/api/auth/google', { credential });
      setUser(data.user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Falha ao entrar. Tente novamente.';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
