'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  RiDashboardLine,
  RiBuildingLine,
  RiUserLine,
  RiShieldUserLine,
  RiAppsLine,
  RiSettings4Line,
  RiFileHistoryLine,
  RiLogoutBoxRLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiBox3Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ModuleRegistration } from '@/lib/api/types';
import { cx } from '@/utils/cx';
import { Avatar } from '@/components/base/avatar/avatar';

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const CORE_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: RiDashboardLine,
  },
  {
    label: 'Organization',
    href: '/organization',
    icon: RiBuildingLine,
    permission: 'organization.read',
  },
  {
    label: 'Users',
    href: '/users',
    icon: RiUserLine,
    permission: 'users.read',
  },
  {
    label: 'Roles & Permissions',
    href: '/roles',
    icon: RiShieldUserLine,
    permission: 'roles.read',
  },
  {
    label: 'Module Registry',
    href: '/modules',
    icon: RiAppsLine,
    permission: 'modules.read',
  },
  {
    label: 'System Settings',
    href: '/settings',
    icon: RiSettings4Line,
    permission: 'settings.read',
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: RiFileHistoryLine,
    permission: 'audit.read',
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [activeModules, setActiveModules] = useState<ModuleRegistration[]>([]);

  useEffect(() => {
    async function loadActiveModules() {
      try {
        const modules = await apiClient<ModuleRegistration[]>(API_ENDPOINTS.MODULES);
        // Business modules that are active and not core
        const businessModules = modules.filter((m) => m.isActivated && !m.isCore);
        setActiveModules(businessModules);
      } catch {
        // Non-critical if modules fail to load
      }
    }

    if (user && hasPermission('modules.read')) {
      loadActiveModules();
    }
  }, [user, hasPermission]);

  const visibleCoreNav = CORE_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside
      className={cx(
        'relative flex flex-col bg-background-primary-default border-r border-border-button-default transition-all duration-300 ease-in-out shrink-0 z-30 select-none shadow-sm',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-separator-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="size-8 rounded-lg bg-[#171B18] flex items-center justify-center shrink-0 p-1.5 shadow-sm border border-border-button-default">
            <Image
              src="/logo.svg"
              alt="Modus"
              width={22}
              height={20}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-text-primary text-title-3-semibold tracking-tight">Modus</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Self-Hosted</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <RiMenuUnfoldLine className="size-5" /> : <RiMenuFoldLine className="size-5" />}
        </button>
      </div>

      {/* Nav items list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-caption-2-medium text-text-tertiary uppercase tracking-wider">
              Core System
            </p>
          )}
          <nav className="space-y-1">
            {visibleCoreNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-body-medium transition-colors font-medium',
                    isActive
                      ? 'bg-accent-50 text-accent-800 font-semibold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cx('size-5 shrink-0', isActive ? 'text-accent-600' : 'text-text-tertiary')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Active Dynamic Modules Section */}
        {activeModules.length > 0 && (
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-caption-2-medium text-text-tertiary uppercase tracking-wider flex items-center justify-between">
                <span>Modules</span>
                <span className="text-[10px] bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded-full font-bold">
                  {activeModules.length}
                </span>
              </p>
            )}
            <nav className="space-y-1">
              {activeModules.map((mod) => {
                const modHref = `/modules/${mod.id}`;
                const isActive = pathname === modHref;
                return (
                  <Link
                    key={mod.id}
                    href={modHref}
                    className={cx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-body-medium transition-colors font-medium',
                      isActive
                        ? 'bg-accent-50 text-accent-800 font-semibold shadow-2xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
                    )}
                    title={collapsed ? mod.name : undefined}
                  >
                    <RiBox3Line className={cx('size-5 shrink-0', isActive ? 'text-accent-600' : 'text-text-tertiary')} />
                    {!collapsed && <span className="truncate">{mod.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-separator-border bg-background-primary-default">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <Avatar
              initials={user?.firstName ? user.firstName[0].toUpperCase() : 'M'}
              size="md"
              color="lime"
              className="shrink-0 font-bold"
            />
            {!collapsed && (
              <div className="flex flex-col min-w-0 truncate">
                <span className="text-body-medium font-semibold text-text-primary truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-caption-2-medium text-text-tertiary uppercase truncate">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-destructive hover:bg-background-tertiary-error transition-colors shrink-0"
            title="Log out"
            aria-label="Log out"
          >
            <RiLogoutBoxRLine className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
