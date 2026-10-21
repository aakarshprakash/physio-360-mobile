import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { api, handleUnauthorized, loadConnection, setServer, setToken } from './api';
import { KEYS, storage } from './storage';
import type { Permission, Session } from './types';

interface AuthValue {
  /** undefined while restoring the saved session on launch. */
  session: Session | null | undefined;
  signIn: (email: string, password: string, server: string) => Promise<Session>;
  signOut: () => Promise<void>;
  refresh: () => Promise<Session | null>;
  can: (p: Permission) => boolean;
  canAny: (...p: Permission[]) => boolean;
  role: string;
}

const AuthContext = createContext<AuthValue | null>(null);

function deviceName(): string {
  const model = Device.modelName ?? (Platform.OS === 'web' ? 'Web browser' : Platform.OS);
  return `Physio360 app · ${model}`.slice(0, 90);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  const clear = useCallback(async () => {
    setToken(null);
    await storage.remove(KEYS.token);
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<{ data: Session }>('/auth/me');
      setSession(me.data);
      return me.data;
    } catch {
      await clear();
      return null;
    }
  }, [clear]);

  // Restore the saved token on launch.
  useEffect(() => {
    handleUnauthorized(() => void clear());
    void loadConnection().then(({ token }) => {
      if (token) void refresh();
      else setSession(null);
    });
  }, [clear, refresh]);

  const signIn = useCallback(async (email: string, password: string, server: string) => {
    setServer(server);
    const res = await api.post<{ token: string; data: Session }>('/auth/token', { email: email.trim().toLowerCase(), password, device_name: deviceName() });
    setToken(res.token);
    await Promise.all([storage.set(KEYS.token, res.token), storage.set(KEYS.server, server.trim()), storage.set(KEYS.email, email.trim())]);
    setSession(res.data);
    return res.data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* token may already be revoked */
    }
    await clear();
  }, [clear]);

  const value = useMemo<AuthValue>(() => {
    const perms = new Set(session?.permissions ?? []);
    return {
      session,
      signIn,
      signOut,
      refresh,
      can: (p) => perms.has(p),
      canAny: (...ps) => ps.some((p) => perms.has(p)),
      role: session?.user.roles?.[0] ?? '',
    };
  }, [session, signIn, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** The signed-in session (only call inside the signed-in area). */
export function useSession(): Session & { can: AuthValue['can']; canAny: AuthValue['canAny']; role: string } {
  const { session, can, canAny, role } = useAuth();
  if (!session) throw new Error('No session');
  return { ...session, can, canAny, role };
}
