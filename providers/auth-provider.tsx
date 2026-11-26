'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  apiClient,
  setAuthTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  isTokenExpired,
  getTokenExpirationMs,
  AUTH_EVENTS,
  STORAGE_KEYS,
} from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  User,
  LoginPayload,
  LoginResponse,
  InstallationStatus,
  PermissionDefinition,
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
  activeModules: string[];
  modulesLoaded: boolean;
  isModuleActive: (moduleId: string) => boolean;
  refreshActiveModules: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInstallationChecked: boolean;
  setupRequired: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload, rememberMe?: boolean, redirectTo?: string) => Promise<void>;
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
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [modulesLoaded, setModulesLoaded] = useState<boolean>(false);
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

  const refreshActiveModules = useCallback(async () => {
    try {
      const active = await apiClient<Array<{ id: string }>>(API_ENDPOINTS.MODULES_ACTIVE);
      setActiveModules(Array.isArray(active) ? active.map((m) => m.id) : []);
    } catch {
      // Keep prior state on transient network failure
    } finally {
      setModulesLoaded(true);
    }
  }, []);

  const isModuleActive = useCallback(
    (moduleId: string) => activeModules.includes(moduleId.toLowerCase()),
    [activeModules]
  );

  const clearAuthState = useCallback(() => {
    setUser(null);
    setPermissions([]);
    setActiveModules([]);
    setModulesLoaded(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    let token = getAccessToken();
    const refresh = getRefreshToken();

    // If both access token and refresh token are missing, user is unauthenticated
    if (!token && !refresh) {
      clearAuthState();
      setIsLoading(false);
      return;
    }

    // If access token is missing or expired, proactively utilize the refresh token
    if ((!token || isTokenExpired(token, 30)) && refresh) {
      token = await refreshAccessToken();
      if (!token) {
        // Only clear session state if refresh token itself was cleared (401/403/expired).
        // Transient network/5xx errors retain the valid refresh token for retry.
        if (!getRefreshToken()) {
          clearAuthState();
        }
        setIsLoading(false);
        return;
      }
    }

    try {
      const profile = await apiClient<User>(API_ENDPOINTS.AUTH_ME);
      setUser(profile);
      await refreshActiveModules();

      if (profile.role === 'SUPER_ADMIN' || profile.role === Role.SUPER_ADMIN) {
        try {
          const allPerms = await apiClient<PermissionDefinition[]>(API_ENDPOINTS.PERMISSIONS);
          setPermissions(
            Array.isArray(allPerms) && allPerms.length > 0
              ? allPerms.map((p) => p.id)
              : CORE_PERMISSIONS.map((p) => p.id)
          );
        } catch {
          setPermissions(CORE_PERMISSIONS.map((p) => p.id));
        }
      } else {
        await fetchRolePermissions(String(profile.role));
      }
    } catch (err: any) {
      // Only wipe credentials if refresh token is also gone or account is forbidden (inactive)
      if (
        err instanceof ApiError &&
        (err.isForbidden || (err.isUnauthorized && !getRefreshToken()))
      ) {
        setAuthTokens(null);
        clearAuthState();
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState, fetchRolePermissions, refreshActiveModules]);

  // Initial installation & session bootstrap (run once on mount, not per route change)
  useEffect(() => {
    let active = true;

    async function checkInstallation() {
      try {
        const status = await apiClient<InstallationStatus>(
          API_ENDPOINTS.INSTALLATION_STATUS,
          { skipAuth: true }
        );
        if (!active) return;
        setSetupRequired(status.setupRequired);
        setIsInstallationChecked(true);

        if (status.setupRequired) {
          setIsLoading(false);
          router.replace('/setup');
          return;
        }

        if (!status.setupRequired && typeof window !== 'undefined' && window.location.pathname === '/setup') {
          setIsLoading(false);
          router.replace('/login');
          return;
        }

        await refreshProfile();
      } catch {
        if (!active) return;
        // Backend might still be spinning up; assume installed and attempt session bootstrap
        setIsInstallationChecked(true);
        await refreshProfile();
      }
    }

    void checkInstallation();
    return () => {
      active = false;
    };
    // Intentionally run once on mount; route guards handle subsequent navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep React auth state synchronized with apiClient and other browser tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAuthCleared = () => {
      clearAuthState();
      setIsLoading(false);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (
        event.key === STORAGE_KEYS.REFRESH_TOKEN ||
        event.key === STORAGE_KEYS.AUTH_TOKEN ||
        event.key === null
      ) {
        const hasTokens = Boolean(getRefreshToken() || getAccessToken());
        if (!hasTokens) {
          clearAuthState();
        } else if (!user) {
          void refreshProfile();
        }
      }
    };

    window.addEventListener(AUTH_EVENTS.CLEARED, handleAuthCleared);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(AUTH_EVENTS.CLEARED, handleAuthCleared);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearAuthState, refreshProfile, user]);

  // Sync active module updates triggered from Module Registry UI
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    const handleModulesUpdated = () => {
      void refreshActiveModules();
    };
    window.addEventListener('modus:modules-updated', handleModulesUpdated);
    return () => window.removeEventListener('modus:modules-updated', handleModulesUpdated);
  }, [user, refreshActiveModules]);

  // Proactive background & wake-up silent refresh:
  // Schedules exact refresh before access token expiration + checks on focus, visibility, and online events
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextRefresh = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      const token = getAccessToken();
      const refresh = getRefreshToken();
      if (!refresh) return;

      const expMs = getTokenExpirationMs(token);
      if (!expMs) return;

      // Target refreshing 2 minutes before expiry (minimum 2s delay)
      const msUntilRefresh = Math.max(2000, expMs - Date.now() - 120_000);
      // Clamp to max 30 days to avoid 32-bit setTimeout overflow
      const clampedMs = Math.min(msUntilRefresh, 2_147_483_647);

      timerId = setTimeout(() => {
        void ensureFreshToken();
      }, clampedMs);
    };

    const ensureFreshToken = async () => {
      const token = getAccessToken();
      const refresh = getRefreshToken();
      if (!refresh) return;

      if (!token || isTokenExpired(token, 120)) {
        await refreshAccessToken();
      }
      scheduleNextRefresh();
    };

    const handleWakeup = () => {
      if (document.visibilityState === 'hidden') return;
      void ensureFreshToken();
    };

    scheduleNextRefresh();

    const interval = setInterval(() => {
      void ensureFreshToken();
    }, 30 * 1000);

    window.addEventListener(AUTH_EVENTS.UPDATED, scheduleNextRefresh);
    window.addEventListener('focus', handleWakeup);
    window.addEventListener('online', handleWakeup);
    document.addEventListener('visibilitychange', handleWakeup);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(interval);
      window.removeEventListener(AUTH_EVENTS.UPDATED, scheduleNextRefresh);
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('online', handleWakeup);
      document.removeEventListener('visibilitychange', handleWakeup);
    };
  }, [user]);

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

  const login = async (
    payload: LoginPayload,
    rememberMe: boolean = false,
    redirectTo?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await apiClient<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });

      setAuthTokens(res.tokens, rememberMe);
      setUser(res.user);
      await refreshActiveModules();

      if (res.user.role === 'SUPER_ADMIN' || res.user.role === Role.SUPER_ADMIN) {
        try {
          const allPerms = await apiClient<PermissionDefinition[]>(API_ENDPOINTS.PERMISSIONS);
          setPermissions(
            Array.isArray(allPerms) && allPerms.length > 0
              ? allPerms.map((p) => p.id)
              : CORE_PERMISSIONS.map((p) => p.id)
          );
        } catch {
          setPermissions(CORE_PERMISSIONS.map((p) => p.id));
        }
      } else {
        await fetchRolePermissions(String(res.user.role));
      }

      const safeRedirect =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/dashboard';
      router.replace(safeRedirect);
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
      setActiveModules([]);
      setModulesLoaded(false);
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
        activeModules,
        modulesLoaded,
        isModuleActive,
        refreshActiveModules,
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
