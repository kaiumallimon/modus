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
  RiBox3Line,
  RiSettings4Line,
  RiFileHistoryLine,
  RiLogoutBoxRLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiQuestionLine,
  RiFeedbackLine,
  RiHeartPulseLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ModuleRegistration, OrganizationSettings } from '@/lib/api/types';
import { cx } from '@/utils/cx';
import { Avatar } from '@/components/base/avatar/avatar';
import { Kbd } from '@/components/base/kbd/kbd';
import { AlertDialog } from '@/components/base/modal/modal';

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: number | string;
}

const BACKEND_NAV_ITEMS: NavItemConfig[] = [
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
    label: 'Roles & Access',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [activeModules, setActiveModules] = useState<ModuleRegistration[]>([]);
  const [auditCount, setAuditCount] = useState<number | undefined>(undefined);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    async function loadBackendData() {
      if (!user) return;

      if (hasPermission('organization.read')) {
        try {
          const organization = await apiClient<OrganizationSettings>(API_ENDPOINTS.ORGANIZATION);
          setOrg(organization);
        } catch {
          // Non-critical
        }
      }

      if (hasPermission('modules.read')) {
        try {
          const modules = await apiClient<ModuleRegistration[]>(API_ENDPOINTS.MODULES);
          const businessModules = modules.filter((m) => m.isActivated && !m.isCore);
          setActiveModules(businessModules);
        } catch {
          // Non-critical
        }
      }

      if (hasPermission('audit.read')) {
        try {
          const res = await apiClient<{ meta?: { total?: number } }>(API_ENDPOINTS.AUDIT_LOGS, {
            params: { page: 1, limit: 1 },
          });
          if (res?.meta?.total !== undefined) {
            setAuditCount(res.meta.total);
          }
        } catch {
          // Non-critical
        }
      }
    }

    loadBackendData();
  }, [user, hasPermission]);

  const visibleNav = BACKEND_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const filteredNav = visibleNav.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <>
      <aside
        className={cx(
          'relative flex flex-col bg-background-primary-default text-text-primary transition-all duration-200 ease-in-out shrink-0 z-30 select-none border-r border-border-button-default h-screen shadow-2xs',
          collapsed ? 'w-18' : 'w-64'
        )}
      >
        {/* Workspace Brand Header */}
        {collapsed ? (
          <div className="flex items-center justify-center h-16 border-b border-border-button-default px-2 shrink-0">
            <button
              onClick={() => setCollapsed(false)}
              className="group relative size-10 rounded-lg flex items-center justify-center hover:bg-background-secondary-default transition-all duration-150"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <div className="size-6 flex items-center justify-center transition-all duration-150 group-hover:opacity-0 group-hover:scale-75">
                <Image
                  src="/logo.svg"
                  alt="Modus"
                  width={24}
                  height={24}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 text-text-primary">
                <RiArrowRightSLine className="size-5" />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between h-16 px-4 border-b border-border-button-default shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="size-9 rounded-xl bg-[#171B18] border border-white/10 flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                <Image
                  src="/logo.svg"
                  alt="Modus"
                  width={22}
                  height={22}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0 truncate">
                <span className="text-body-2-medium font-bold text-text-primary truncate">
                  {org?.name || 'Modus Inc.'}
                </span>
                <span className="text-[11px] text-text-tertiary truncate">
                  Self-Hosted v1.0
                </span>
              </div>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-lg border border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors shrink-0 shadow-2xs"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <RiArrowLeftSLine className="size-4" />
            </button>
          </div>
        )}

        {/* Quick Search Bar */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          {collapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="size-9 rounded-lg bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors shadow-2xs"
                title="Search (⌘K)"
                aria-label="Search"
              >
                <RiSearchLine className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center">
              <RiSearchLine className="absolute start-2.5 size-4 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 ps-8 pe-12 rounded-lg bg-background-secondary-default border border-border-button-default text-body-2-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all shadow-2xs"
              />
              <div className="absolute end-2 flex items-center pointer-events-none">
                <Kbd className="bg-background-primary-default border border-border-button-default text-text-tertiary shadow-2xs">⌘K</Kbd>
              </div>
            </div>
          )}
        </div>

        {/* Nav List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
          <div>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                Main Menu
              </p>
            )}
            <nav className="space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                const badge = item.href === '/audit-logs' ? auditCount : item.badge;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cx(
                      'group relative flex items-center justify-between rounded-lg transition-colors',
                      collapsed ? 'size-10 justify-center mx-auto' : 'px-3 py-2 text-body-2-medium',
                      isActive
                        ? 'bg-background-secondary-default text-text-primary font-semibold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover font-medium'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active left indicator bar matching reference image */}
                    {isActive && !collapsed && (
                      <span className="absolute start-0 top-1.5 bottom-1.5 w-1 rounded-e-full bg-accent-500" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cx(
                          'size-4.5 shrink-0 transition-colors',
                          isActive ? 'text-accent-600 dark:text-accent-400' : 'text-text-tertiary group-hover:text-text-primary'
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && badge !== undefined && (
                      <span className={cx(
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                        isActive
                          ? 'bg-background-primary-default border border-border-button-default text-text-primary'
                          : 'bg-background-secondary-default text-text-tertiary'
                      )}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Dynamic Installed Modules */}
          {activeModules.length > 0 && (
            <div>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center justify-between">
                  <span>Modules</span>
                  <span className="text-[10px] bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300 px-1.5 py-0.5 rounded font-semibold">
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
                        'group relative flex items-center justify-between rounded-lg transition-colors',
                        collapsed ? 'size-10 justify-center mx-auto' : 'px-3 py-2 text-body-2-medium',
                        isActive
                          ? 'bg-background-secondary-default text-text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover font-medium'
                      )}
                      title={collapsed ? mod.name : undefined}
                    >
                      {isActive && !collapsed && (
                        <span className="absolute start-0 top-1.5 bottom-1.5 w-1 rounded-e-full bg-accent-500" />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RiBox3Line className={cx('size-4.5 shrink-0', isActive ? 'text-accent-600 dark:text-accent-400' : 'text-text-tertiary group-hover:text-text-primary')} />
                        {!collapsed && <span className="truncate">{mod.name}</span>}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* PINNED FOOTER (NOT SCROLLABLE) */}
        <div className="shrink-0 border-t border-border-button-default bg-background-primary-default">
          {/* Pinned Helper & Settings Links */}
          <div className="p-2 space-y-0.5">
            <button
              type="button"
              className={cx(
                'w-full flex items-center text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default rounded-lg transition-colors group cursor-pointer',
                collapsed ? 'size-10 justify-center mx-auto' : 'gap-2.5 px-3 py-1.5'
              )}
              title={collapsed ? 'Help Center' : undefined}
            >
              <RiQuestionLine className="size-4 shrink-0 text-text-tertiary group-hover:text-text-primary transition-colors" />
              {!collapsed && <span>Help center</span>}
            </button>

            <button
              type="button"
              className={cx(
                'w-full flex items-center text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default rounded-lg transition-colors group cursor-pointer',
                collapsed ? 'size-10 justify-center mx-auto' : 'gap-2.5 px-3 py-1.5'
              )}
              title={collapsed ? 'Feedback' : undefined}
            >
              <RiFeedbackLine className="size-4 shrink-0 text-text-tertiary group-hover:text-text-primary transition-colors" />
              {!collapsed && <span>Feedback</span>}
            </button>

            {hasPermission('settings.read') && (
              <Link
                href="/settings"
                className={cx(
                  'flex items-center text-body-2-medium rounded-lg transition-colors group',
                  collapsed ? 'size-10 justify-center mx-auto' : 'gap-2.5 px-3 py-1.5',
                  pathname === '/settings'
                    ? 'bg-background-secondary-default text-text-primary font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
                )}
                title={collapsed ? 'Settings' : undefined}
              >
                <RiSettings4Line
                  className={cx(
                    'size-4 shrink-0 transition-colors',
                    pathname === '/settings'
                      ? 'text-accent-600 dark:text-accent-400'
                      : 'text-text-tertiary group-hover:text-text-primary'
                  )}
                />
                {!collapsed && <span>Settings</span>}
              </Link>
            )}
          </div>

          {/* System Status Card matching reference upgrade card */}
          {!collapsed && (
            <div className="px-3 pb-2">
              <div className="rounded-xl border border-border-button-default bg-background-secondary-default/50 hover:bg-background-secondary-default p-2.5 flex items-center justify-between transition-colors shadow-2xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="size-7 rounded-lg bg-accent-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <RiHeartPulseLine className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-caption-1-semibold font-semibold text-text-primary truncate">
                      Cluster Online
                    </span>
                    <span className="text-[10px] text-text-tertiary truncate">
                      Self-Hosted • v1.0.0
                    </span>
                  </div>
                </div>
                <span className="size-2 rounded-full bg-status-lime-text" />
              </div>
            </div>
          )}

          {/* User Profile & Logout */}
          <div className="p-3 border-t border-border-button-default">
            <div className={cx('flex items-center justify-between gap-2', collapsed && 'justify-center')}>
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <Avatar
                  initials={user?.firstName ? user.firstName[0].toUpperCase() : 'M'}
                  size="md"
                  color="lime"
                  className="shrink-0 font-bold"
                />
                {!collapsed && (
                  <div className="flex flex-col min-w-0 truncate">
                    <span className="text-body-2-medium font-semibold text-text-primary truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Modus Admin'}
                    </span>
                    <span className="text-[11px] text-text-tertiary uppercase truncate">
                      {user?.role?.replace('_', ' ') || 'Super Admin'}
                    </span>
                  </div>
                )}
              </div>
              {!collapsed && (
                <button
                  onClick={() => setLogoutDialogOpen(true)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-background-secondary-default transition-colors shrink-0"
                  title="Log out"
                  aria-label="Log out"
                >
                  <RiLogoutBoxRLine className="size-4" />
                </button>
              )}
            </div>
            {collapsed && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => setLogoutDialogOpen(true)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-background-secondary-default transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <RiLogoutBoxRLine className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Alert Dialog */}
      <AlertDialog
        isOpen={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Log out of Modus"
        description="Are you sure you want to end your current session and log out?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          await logout();
        }}
      />
    </>
  );
}