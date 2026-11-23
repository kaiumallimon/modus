'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, setAuthTokens, getAccessToken } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  User,
  LoginPayload,
  LoginResponse,
  InstallationStatus,
  RoleDocument,
  Role,
} from '@/lib/api/types';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAny,
  hasAllPermissions as checkAll,
  CORE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/permissions';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isInstallationChecked: boolean;
  setupRequired: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInstallationChecked, setIsInstallationChecked] = useState<boolean>(false);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);

  const fetchRolePermissions = useCallback(async (roleCode: string) => {
    // Populate built-in fallback permissions immediately
    const fallback = DEFAULT_ROLE_PERMISSIONS[roleCode] || [];
    setPermissions(fallback);

    try {
      const roles = await apiClient<RoleDocument[]>(API_ENDPOINTS.ROLES);
      const matched = roles?.find((r) => r.code === roleCode);
      if (matched && matched.permissions) {
        setPermissions(matched.permissions);
      }
    } catch {
      // Non-critical if permissions call fails (retains fallback)
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await apiClient<User>(API_ENDPOINTS.AUTH_ME);
      setUser(profile);
      if (profile.role === 'SUPER_ADMIN' || profile.role === Role.SUPER_ADMIN) {
        // Super Admin has all permissions
        setPermissions(CORE_PERMISSIONS.map((p) => p.id));
      } else {
        await fetchRolePermissions(String(profile.role));
      }
    } catch {
      setAuthTokens(null);
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchRolePermissions]);

  // Initial installation status check
  useEffect(() => {
    async function checkInstallation() {
      try {
        const status = await apiClient<InstallationStatus>(
          API_ENDPOINTS.INSTALLATION_STATUS,
          { skipAuth: true }
        );
        setSetupRequired(status.setupRequired);
        setIsInstallationChecked(true);

        if (status.setupRequired && pathname !== '/setup') {
          router.replace('/setup');
          return;
        }

        if (!status.setupRequired && pathname === '/setup') {
          router.replace('/login');
          return;
        }

        await refreshProfile();
      } catch {
        // Backend might still be spinning up, assume installed
        setIsInstallationChecked(true);
        await refreshProfile();
      }
    }

    checkInstallation();
  }, [pathname, refreshProfile, router]);

  // Route protection
  useEffect(() => {
    if (!isInstallationChecked || isLoading) return;

    const isPublicRoute =
      pathname === '/login' ||
      pathname === '/setup' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password';

    if (!user && !isPublicRoute) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    } else if (
      user &&
      (pathname === '/login' ||
        pathname === '/setup' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password')
    ) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, isInstallationChecked, pathname, router]);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await apiClient<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });

      setAuthTokens(res.tokens);
      setUser(res.user);

      if (res.user.role === 'SUPER_ADMIN' || res.user.role === Role.SUPER_ADMIN) {
        setPermissions(CORE_PERMISSIONS.map((p) => p.id));
      } else {
        await fetchRolePermissions(String(res.user.role));
      }

      router.replace('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient(API_ENDPOINTS.AUTH_LOGOUT, { method: 'POST' });
    } catch {
      // Ignore logout API failures
    } finally {
      setAuthTokens(null);
      setUser(null);
      setPermissions([]);
      router.replace('/login');
    }
  };

  const hasPerm = useCallback(
    (perm: string) => checkPermission(user, permissions, perm),
    [user, permissions]
  );

  const hasAnyPerm = useCallback(
    (perms: string[]) => checkAny(user, permissions, perms),
    [user, permissions]
  );

  const hasAllPerm = useCallback(
    (perms: string[]) => checkAll(user, permissions, perms),
    [user, permissions]
  );

  const isSuperAdmin = Boolean(
    user && (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN')
  );
  const isAdmin = Boolean(
    isSuperAdmin || (user && (user.role === Role.ADMIN || user.role === 'ADMIN'))
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        isInstallationChecked,
        setupRequired,
        isSuperAdmin,
        isAdmin,
        login,
        logout,
        refreshProfile,
        hasPermission: hasPerm,
        hasAnyPermission: hasAnyPerm,
        hasAllPermissions: hasAllPerm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
