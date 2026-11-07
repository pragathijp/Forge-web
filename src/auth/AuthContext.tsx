import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { api, setAccessToken } from '../api/client';
import { AuthContext } from './useAuth';
import type { User } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    api
      .post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return api.get('/auth/me');
      })
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function register(organizationName: string, email: string, password: string, name: string) {
    const res = await api.post('/auth/register', { organizationName, email, password, name });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}