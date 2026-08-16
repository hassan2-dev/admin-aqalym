'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { StaffUser } from '@/domain/entities';
import type { Permission } from '@/domain/enums';
import { demoDb } from '@/infrastructure/demo/store';
import { authService } from '@/infrastructure/services/auth-service';
import { isDemoMode } from '@/infrastructure/firebase/client';

interface AuthContextValue {
  user: StaffUser | null;
  permissions: Permission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await authService.getCurrentUser();
        if (active) setUser(current);
      } finally {
        if (active) setLoading(false);
      }
    })();
    const unsub = authService.onAuthChanged((u) => {
      if (active) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const permissions = useMemo(() => {
    if (isDemoMode) return demoDb.getPermissions(user);
    // In Firebase mode roles should be loaded; fallback to empty until hydrated
    return demoDb.getPermissions(user);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const can = useCallback((permission: Permission) => permissions.includes(permission), [permissions]);

  const value = useMemo(
    () => ({ user, permissions, loading, login, logout, can }),
    [user, permissions, loading, login, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
