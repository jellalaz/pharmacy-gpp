import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { User, Role } from '../types';
export const homeFor = (role: Role) =>
  role === 'ADMIN' ? '/admin' : role === 'SALES' ? '/pos' : role === 'INVENTORY' ? '/warehouse' : '/overview';
const AuthContext = createContext<{
  user: User | null;
  pending: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}>({
  user: null,
  pending: true,
  error: null,
  login: async () => {
    throw new Error('Auth missing');
  },
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/auth/me'),
    retry: false,
    staleTime: 60000,
  });
  async function login(email: string, password: string) {
    const user = await api<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await client.cancelQueries();
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    client.setQueryData(['me'], user);
    return user;
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    await client.cancelQueries();
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    client.setQueryData(['me'], null);
  }
  return (
    <AuthContext.Provider
      value={{ user: me.data ?? null, pending: me.isPending, error: me.error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
