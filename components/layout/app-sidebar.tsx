'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  RiDashboardLine,
  RiUserLine,
  RiShieldUserLine,
  RiBox3Line,
  RiSettings4Line,
  RiFileHistoryLine,
  RiLogoutBoxRLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiHeartPulseLine,
  RiGitMergeLine,
  RiLineChartLine,
  RiPuzzle2Line,
  RiQuestionLine,
  RiFeedbackLine,
  RiRocket2Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ModuleRegistration } from '@/lib/api/types';
import { cx } from '@/utils/cx';
import { Avatar } from '@/components/base/avatar/avatar';
import { Counter } from '@/components/base/badges/counter';
import { Kbd } from '@/components/base/kbd/kbd';

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: number | string;
}

const MAIN_MENU_ITEMS: NavItemConfig[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: RiDashboardLine,
  },
  {
    label: 'Modules',
    href: '/modules',
    icon: RiBox3Line,
    permission: 'modules.read',
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
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: RiFileHistoryLine,
    permission: 'audit.read',
    badge: 33,
  },
];

const TOOLS_ITEMS: NavItemConfig[] = [
  {
    label: 'Health & Status',
    href: '/dashboard',
    icon: RiHeartPulseLine,
  },
  {
    label: 'Automation',
    href: '/settings',
    icon: RiGitMergeLine,
  },
  {
    label: 'Analytics',
    href: '/dashboard',
    icon: RiLineChartLine,
  },
  {
    label: 'Integrations',
    href: '/modules',
    icon: RiPuzzle2Line,
  },
];

const WORKSPACE_ITEMS = [
  { label: 'Core Platform', color: 'bg-accent-500', count: 5, href: '/modules' },
  { label: 'Extensions & Addons', color: 'bg-purple-500', count: 4, href: '/modules' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModules, setActiveModules] = useState<ModuleRegistration[]>([]);

  useEffect(() => {
    async function loadActiveModules() {
      try {
        const modules = await apiClient<ModuleRegistration[]>(API_ENDPOINTS.MODULES);
        const businessModules = modules.filter((m) => m.isActivated && !m.isCore);
        setActiveModules(businessModules);
      } catch {
        // Non-critical
      }
    }

    if (user && hasPermission('modules.read')) {
      loadActiveModules();
    }
  }, [user, hasPermission]);

  const visibleMainMenu = MAIN_MENU_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside
      className={cx(
        'relative flex flex-col bg-background-primary-default border-r border-border-button-default transition-all duration-300 ease-in-out shrink-0 z-30 select-none shadow-xs',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Workspace / Org Header */}
      <div className="flex items-center justify-between h-16 px-3.5 border-b border-separator-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="size-9 rounded-xl bg-[#171B18] flex items-center justify-center shrink-0 p-2 shadow-sm border border-border-button-default">
            <Image
              src="/logo.svg"
              alt="Modus"
              width={20}
              height={20}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 truncate">
              <span className="font-bold text-text-primary text-body-medium tracking-tight truncate">
                Modus Enterprise
              </span>
              <span className="text-[11px] text-text-tertiary font-medium">Self-Hosted · v1.0.0</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <RiArrowRightSLine className="size-4" /> : <RiArrowLeftSLine className="size-4" />}
        </button>
      </div>

      {/* Quick Search Bar */}
      <div className="px-3 pt-3 pb-1">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full h-9 rounded-xl bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
            title="Search (⌘K)"
          >
            <RiSearchLine className="size-4" />
          </button>
        ) : (
          <div className="relative flex items-center">
            <RiSearchLine className="absolute start-2.5 size-4 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 ps-8 pe-12 rounded-xl bg-background-secondary-default border border-border-button-default text-body-2-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
            />
            <div className="absolute end-2 flex items-center pointer-events-none">
              <Kbd>⌘K</Kbd>
            </div>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* MAIN MENU */}
        <div>
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Main Menu
            </p>
          )}
          <nav className="space-y-0.5">
            {visibleMainMenu.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cx(
                    'relative flex items-center justify-between px-2.5 py-2 rounded-xl text-body-medium transition-all duration-150',
                    isActive
                      ? 'bg-accent-50/70 dark:bg-accent-950/30 text-accent-950 dark:text-accent-300 font-semibold shadow-2xs before:absolute before:inset-y-1.5 before:start-0 before:w-1 before:rounded-full before:bg-accent-500'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default font-medium'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cx(
                        'size-5 shrink-0 transition-colors',
                        isActive ? 'text-accent-600 dark:text-accent-400' : 'text-text-tertiary'
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge !== undefined && (
                    <Counter color="neutral">{item.badge}</Counter>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Registered Modules (if any) */}
        {activeModules.length > 0 && (
          <div>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center justify-between">
                <span>Active Modules</span>
                <span className="text-[10px] bg-accent-100 dark:bg-accent-950 text-accent-800 dark:text-accent-300 px-1.5 py-0.5 rounded-full font-bold">
                  {activeModules.length}
                </span>
              </p>
            )}
            <nav className="space-y-0.5">
              {activeModules.map((mod) => {
                const modHref = `/modules/${mod.id}`;
                const isActive = pathname === modHref;
                return (
                  <Link
                    key={mod.id}
                    href={modHref}
                    className={cx(
                      'relative flex items-center justify-between px-2.5 py-2 rounded-xl text-body-medium transition-all duration-150',
                      isActive
                        ? 'bg-accent-50/70 dark:bg-accent-950/30 text-accent-950 dark:text-accent-300 font-semibold before:absolute before:inset-y-1.5 before:start-0 before:w-1 before:rounded-full before:bg-accent-500'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default font-medium'
                    )}
                    title={collapsed ? mod.name : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RiBox3Line className={cx('size-5 shrink-0', isActive ? 'text-accent-600' : 'text-text-tertiary')} />
                      {!collapsed && <span className="truncate">{mod.name}</span>}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* TOOLS */}
        <div>
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Tools
            </p>
          )}
          <nav className="space-y-0.5">
            {TOOLS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-body-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors font-medium"
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="size-5 shrink-0 text-text-tertiary" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* WORKSPACE */}
        <div>
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Workspace
            </p>
          )}
          <nav className="space-y-0.5">
            {WORKSPACE_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl text-body-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors font-medium"
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cx('size-2 rounded-full shrink-0', item.color)} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && (
                  <span className="text-[11px] text-text-tertiary font-medium">
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom Helper Links */}
        <div className="pt-2 border-t border-separator-border space-y-0.5">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
            title={collapsed ? 'Help Center' : undefined}
          >
            <RiQuestionLine className="size-4 shrink-0 text-text-tertiary" />
            {!collapsed && <span>Help Center</span>}
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
            title={collapsed ? 'Feedback' : undefined}
          >
            <RiFeedbackLine className="size-4 shrink-0 text-text-tertiary" />
            {!collapsed && <span>Feedback</span>}
          </button>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
            title={collapsed ? 'Settings' : undefined}
          >
            <RiSettings4Line className="size-4 shrink-0 text-text-tertiary" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Upgrade / Status Card */}
        {!collapsed && (
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/70 p-3 shadow-2xs hover:bg-background-secondary-hover transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-accent-500/15 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400 flex items-center justify-center shrink-0">
                <RiRocket2Line className="size-4.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-caption-1-semibold text-text-primary truncate group-hover:text-accent-700 transition-colors">
                  System Operational
                </span>
                <span className="text-[11px] text-text-tertiary truncate">All nodes connected</span>
              </div>
              <RiArrowRightSLine className="size-4 text-text-tertiary group-hover:text-text-primary transition-colors shrink-0" />
            </div>
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
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Modus Admin'}
                </span>
                <span className="text-caption-2-medium text-text-tertiary uppercase truncate">
                  {user?.role?.replace('_', ' ') || 'Super Admin'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-destructive hover:bg-background-tertiary-error transition-colors shrink-0"
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
