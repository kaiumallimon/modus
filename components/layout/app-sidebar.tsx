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
  RiSettings3Line,
  RiFileHistoryLine,
  RiLogoutBoxRLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiFeedbackLine,
  RiMoreFill,
  RiNotification3Line,
  RiHomeLine,
  RiLifebuoyLine,
  RiBookOpenLine,
  RiFolderCloudLine,
} from '@remixicon/react';
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from 'react-aria-components';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ModuleRegistration } from '@/lib/api/types';
import { cx } from '@/utils/cx';
import { Avatar } from '@/components/base/avatar/avatar';
import { Kbd } from '@/components/base/kbd/kbd';
import { AlertDialog } from '@/components/base/modal/modal';
import { SettingsModal } from '@/components/application/settings/settings-modal';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { ScrollFade, useScrollFade } from '@/components/foundations/scroll-fade/scroll-fade';
import { toast } from '@/components/base/toast/toast';

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
    label: 'CDN Explorer',
    href: '/cdn',
    icon: RiFolderCloudLine,
    permission: 'cdn.read',
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
  const [activeModules, setActiveModules] = useState<ModuleRegistration[]>([]);
  const [auditCount, setAuditCount] = useState<number | undefined>(undefined);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollFade = useScrollFade();

  useEffect(() => {
    async function loadBackendData() {
      if (!user) return;

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

  const renderUserMenuContent = (close: () => void) => (
    <>
      {/* Header: User name, email and Settings gear */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex flex-col min-w-0">
          <span className="text-body-2-medium font-semibold text-text-primary truncate">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Modus Admin'}
          </span>
          <span className="text-caption-1-regular text-text-tertiary truncate">
            {user?.email || 'admin@modus.local'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            close();
            setSettingsOpen(true);
          }}
          className="size-7.5 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors shrink-0 cursor-pointer"
          title="Settings"
          aria-label="Settings"
        >
          <RiSettings3Line className="size-4.5" />
        </button>
      </div>

      <div className="my-1 border-t border-separator-border" />

      {/* Feedback Row */}
      <button
        type="button"
        onClick={() => {
          close();
          toast('Feedback dialog opened', { status: 'information' });
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
      >
        <span>Feedback</span>
        <RiFeedbackLine className="size-4.5 text-text-tertiary" />
      </button>

      {/* Settings Row */}
      <button
        type="button"
        onClick={() => {
          close();
          setSettingsOpen(true);
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
      >
        <span>Settings</span>
        <RiSettings3Line className="size-4.5 text-text-tertiary" />
      </button>

      {/* Theme Row with inline 3-option compact pill toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl text-body-2-medium text-text-secondary select-none">
        <span>Theme</span>
        <ThemeToggle label={false} />
      </div>

      {/* Home Page Link */}
      <Link
        href="/dashboard"
        onClick={close}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start"
      >
        <span>Home Page</span>
        <RiHomeLine className="size-4.5 text-text-tertiary" />
      </Link>

      {/* Help */}
      <button
        type="button"
        onClick={() => {
          close();
          toast('Help Center documentation opened', { status: 'information' });
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
      >
        <span>Help</span>
        <RiLifebuoyLine className="size-4.5 text-text-tertiary" />
      </button>

      {/* Docs */}
      <button
        type="button"
        onClick={() => {
          close();
          toast('Platform documentation opened', { status: 'information' });
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
      >
        <span>Docs</span>
        <RiBookOpenLine className="size-4.5 text-text-tertiary" />
      </button>

      {/* Log Out */}
      <button
        type="button"
        onClick={() => {
          close();
          setLogoutDialogOpen(true);
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body-2-medium text-text-secondary hover:text-text-error-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer group"
      >
        <span>Log Out</span>
        <RiLogoutBoxRLine className="size-4.5 text-text-tertiary group-hover:text-text-error-primary" />
      </button>

      <div className="my-1 border-t border-separator-border" />

      {/* All Systems Normal Status Row */}
      <div className="flex items-center justify-between px-3 py-2 text-caption-1-medium">
        <span className="text-accent-700 dark:text-accent-300 font-medium">
          All systems normal.
        </span>
        <span className="size-2 rounded-full bg-accent-500 animate-pulse" />
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cx(
          'relative flex flex-col bg-background-primary-default text-text-primary transition-all duration-200 ease-in-out shrink-0 z-30 select-none border-r border-border-button-default h-full shadow-2xs',
          collapsed ? 'w-18' : 'w-64'
        )}
      >
        {/* Workspace Brand / Team Header (Vercel Style) */}
        {collapsed ? (
          <div className="flex items-center justify-center h-14 border-b border-border-button-default px-2 shrink-0">
            <button
              onClick={() => setCollapsed(false)}
              className="group relative size-9 rounded-full flex items-center justify-center hover:bg-background-secondary-default transition-all duration-150"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <div className="size-6 flex items-center justify-center transition-all duration-150 group-hover:opacity-0 group-hover:scale-75">
                <Image
                  src="/brand/modus-symbol-lime-on-transparent.svg"
                  alt="Modus"
                  width={22}
                  height={22}
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
          <div className="flex items-center justify-between h-14 px-3.5 border-b border-border-button-default shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 overflow-hidden min-w-0 rounded-lg p-1 -ms-1 hover:bg-background-secondary-default transition-colors group cursor-pointer"
            >
              <div className="size-6 flex items-center justify-center shrink-0">
                <Image
                  src="/brand/modus-symbol-lime-on-transparent.svg"
                  alt="Modus"
                  width={24}
                  height={24}
                  priority
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
                />
              </div>
              <span className="text-body-medium font-bold text-text-primary tracking-tight truncate">
                Modus
              </span>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="size-7.5 rounded-full border border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors shrink-0 shadow-2xs flex items-center justify-center"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <RiArrowLeftSLine className="size-4" />
            </button>
          </div>
        )}

        {/* Quick Search Bar (Pilled Vercel Find Style) */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          {collapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="size-8.5 rounded-full bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors shadow-2xs"
                title="Find (F)"
                aria-label="Find"
              >
                <RiSearchLine className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center">
              <RiSearchLine className="absolute start-3 size-4 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                placeholder="Find"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8.5 ps-9 pe-9 rounded-full bg-background-secondary-default border border-border-button-default text-body-2-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all shadow-2xs"
              />
              <div className="absolute end-2.5 flex items-center pointer-events-none">
                <Kbd className="bg-background-primary-default border border-border-button-default text-text-tertiary shadow-2xs text-[10px] px-1.5 py-0.5 rounded-full">
                  F
                </Kbd>
              </div>
            </div>
          )}
        </div>

        {/* Nav List Wrapper with Progressive Top & Bottom Fades */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Top Scroll Fade (fades items under searchbar on scroll) */}
          <ScrollFade progress={scrollFade.progress} surfaceClassName="from-background-primary-default" />

          {/* Scrollable Navigation Items */}
          <div
            onScroll={scrollFade.onScroll}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-4 min-h-0 [scrollbar-width:thin]"
          >
            <div>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Main Menu
                </p>
              )}
              <nav className="space-y-1">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
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
                      {isActive && !collapsed && (
                        <span className="absolute start-0 top-1.5 bottom-1.5 w-1 rounded-e-full bg-accent-500" />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cx(
                            'size-4.5 shrink-0 transition-colors',
                            isActive
                              ? 'text-accent-600 dark:text-accent-400'
                              : 'text-text-tertiary group-hover:text-text-primary'
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && badge !== undefined && (
                        <span
                          className={cx(
                            'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                            isActive
                              ? 'bg-background-primary-default border border-border-button-default text-text-primary'
                              : 'bg-background-secondary-default text-text-tertiary'
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Dynamic Installed Business Modules */}
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
                          <RiBox3Line
                            className={cx(
                              'size-4.5 shrink-0',
                              isActive
                                ? 'text-accent-600 dark:text-accent-400'
                                : 'text-text-tertiary group-hover:text-text-primary'
                            )}
                          />
                          {!collapsed && <span className="truncate">{mod.name}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Bottom Scroll Fade (fades items above pinned footer) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-background-primary-default to-transparent"
          />
        </div>

        {/* PINNED FOOTER: Avatar, Name, Three-Dot Context Trigger, & Notifications */}
        <div className="shrink-0 bg-background-primary-default p-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2.5">
              {/* Notification Bell Button (Top) */}
              <button
                type="button"
                onClick={() => toast('No unread notifications', { status: 'information' })}
                className="relative size-8 rounded-full border border-border-button-default bg-background-primary-default hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary flex items-center justify-center transition-colors shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <RiNotification3Line className="size-4" />
                <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-blue-500 ring-2 ring-background-primary-default" />
              </button>

              {/* Three-Dot Popover Context Menu Trigger (Middle) */}
              <AriaDialogTrigger>
                <AriaButton
                  className="size-8 rounded-full border border-border-button-default bg-background-primary-default hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary flex items-center justify-center transition-colors shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                  aria-label="User preferences and options"
                >
                  <RiMoreFill className="size-4" />
                </AriaButton>
                <AriaPopover
                  placement="right bottom"
                  offset={8}
                  className="z-110 w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-2xl transition duration-150 ease-out outline-none select-none"
                >
                  <AriaDialog className="outline-none flex flex-col gap-0.5">
                    {({ close }) => renderUserMenuContent(close)}
                  </AriaDialog>
                </AriaPopover>
              </AriaDialogTrigger>

              {/* Avatar (Bottom) */}
              <Avatar
                src={user?.avatarUrl || user?.avatar || undefined}
                initials={user?.firstName ? user.firstName[0].toUpperCase() : 'M'}
                size="md"
                color="lime"
                className="shrink-0 font-bold"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <Avatar
                  src={user?.avatarUrl || user?.avatar || undefined}
                  initials={user?.firstName ? user.firstName[0].toUpperCase() : 'M'}
                  size="md"
                  color="lime"
                  className="shrink-0 font-bold"
                />
                <div className="flex flex-col min-w-0 truncate">
                  <span className="text-body-2-medium font-semibold text-text-primary truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Modus Admin'}
                  </span>
                  <span className="text-[11px] text-text-tertiary uppercase truncate">
                    {user?.role?.replace('_', ' ') || 'Super Admin'}
                  </span>
                </div>
              </div>

              {/* Right: Three Dots Trigger & Notification Bell */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Three-Dot Popover Context Menu Trigger */}
                <AriaDialogTrigger>
                  <AriaButton
                    className="size-7.5 rounded-full border border-border-button-default bg-background-primary-default hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary flex items-center justify-center transition-colors shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                    aria-label="User preferences and options"
                  >
                    <RiMoreFill className="size-4" />
                  </AriaButton>
                  <AriaPopover
                    placement="top end"
                    offset={8}
                    className="z-110 w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-2xl transition duration-150 ease-out outline-none select-none"
                  >
                    <AriaDialog className="outline-none flex flex-col gap-0.5">
                      {({ close }) => renderUserMenuContent(close)}
                    </AriaDialog>
                  </AriaPopover>
                </AriaDialogTrigger>

                {/* Notification Bell Button with Blue Dot */}
                <button
                  type="button"
                  onClick={() => toast('No unread notifications', { status: 'information' })}
                  className="relative size-7.5 rounded-full border border-border-button-default bg-background-primary-default hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary flex items-center justify-center transition-colors shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <RiNotification3Line className="size-4" />
                  {/* Blue Unread Indicator Dot */}
                  <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-blue-500 ring-2 ring-background-primary-default" />
                </button>
              </div>
            </div>
          )}
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

      {/* App-Wide Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        planArtSrc="/templates/settings-plan-art.png"
      />
    </>
  );
}
