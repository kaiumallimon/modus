"use client";

import { useDirection } from "@/components/foundations/direction/direction";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  RiBuildingLine,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiPaletteLine,
  RiSettings6Line,
  RiShieldUserLine,
  RiUserLine,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { useAuth } from "@/providers/auth-provider";
import { SettingsGeneral } from "./settings-general";
import { SettingsProfile } from "./settings-profile";
import { SettingsOrganization } from "./settings-organization";
import { SettingsAppearance } from "./settings-appearance";
import { SettingsAccess } from "./settings-access";
import { SettingsStorage } from "./settings-storage";
import { SettingsTools } from "./settings-tools";

export type SettingsPage =
  | "profile"
  | "organization"
  | "general"
  | "appearance"
  | "access"
  | "storage"
  | "tools"
  | "marketplace";

export interface SettingsModalProps {
  /** Controlled open state, owned by the host page, sidebar, or menu. */
  isOpen: boolean;
  /** Called by the backdrop, close button, and Escape key. */
  onClose: () => void;
  /** Page selected each time the modal opens. */
  defaultPage?: SettingsPage;
  /** Optional product artwork used by the animated Current plan card. */
  planArtSrc?: string;
  /** Optional marketplace pane, including its own fixed header and scroll region. */
  marketplace?: ReactNode;
}

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

interface NavEntry {
  label: string;
  icon: IconComponent;
  page?: SettingsPage;
  superAdminOnly?: boolean;
}

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: "Account & Access",
    items: [
      { label: "Profile", icon: RiUserLine, page: "profile" },
      { label: "My Permissions", icon: RiShieldUserLine, page: "access" },
    ],
  },
  {
    label: "Organization & System",
    items: [
      {
        label: "Organization",
        icon: RiBuildingLine,
        page: "organization",
        superAdminOnly: true,
      },
      { label: "System Preferences", icon: RiSettings6Line, page: "general" },
      { label: "Appearance", icon: RiPaletteLine, page: "appearance" },
    ],
  },
];

const PAGE_TITLES: Record<SettingsPage, string> = {
  profile: "Profile Settings",
  organization: "Organization Settings",
  general: "System Preferences",
  appearance: "Appearance Settings",
  access: "My Role & Permissions",
  storage: "Storage",
  tools: "Tools",
  marketplace: "Marketplace",
};

export function SettingsModal({
  isOpen,
  onClose,
  defaultPage = "profile",
  planArtSrc,
  marketplace,
}: SettingsModalProps) {
  const direction = useDirection();
  const { isSuperAdmin } = useAuth();
  const [page, setPage] = useState<SettingsPage>(defaultPage);

  // Mount/visible two-phase state for enter/exit animations
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // "Saved" toast
  const [savedPhase, setSavedPhase] = useState<"hidden" | "shown" | "leaving">("hidden");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSavedToast = () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedPhase("shown");
    savedTimer.current = setTimeout(() => {
      setSavedPhase("leaving");
      savedTimer.current = setTimeout(() => setSavedPhase("hidden"), 200);
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // Sync open state with mount/visible
  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) {
        clearTimeout(unmountTimer.current);
        unmountTimer.current = null;
      }
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      unmountTimer.current = setTimeout(() => {
        setMounted(false);
        unmountTimer.current = null;
      }, 300);
    }
  }, [isOpen]);

  // Reset page when reopened
  useEffect(() => {
    if (isOpen) {
      if (defaultPage === "organization" && !isSuperAdmin) {
        setPage("profile");
      } else {
        setPage(defaultPage);
      }
    }
  }, [isOpen, defaultPage, isSuperAdmin]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!mounted) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mounted]);

  const [contentScrolled, setContentScrolled] = useState(false);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      dir={direction}
      className={cx(
        "fixed inset-0 z-100 flex items-center justify-center p-4",
        "transition-opacity duration-300 ease-out",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cx(
          "absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Dialog panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          "relative flex h-[614px] max-h-[calc(100dvh-32px)] w-[871px] max-w-[calc(100vw-32px)]",
          "overflow-clip rounded-3xl bg-background-full shadow-2xl outline-none border border-border-button-default",
          "transition-[transform,opacity,filter] duration-300 ease-out",
          visible ? "scale-100 opacity-100 blur-0" : "scale-95 opacity-0 blur-xs",
        )}
      >
        {/* Nav rail */}
        <nav
          aria-label="Settings sections"
          className="flex w-16 shrink-0 flex-col gap-5 overflow-y-auto border-e border-separator-border bg-background-secondary-default p-2.5 sm:w-52 lg:w-60"
        >
          {NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter(
              (item) =>
                (!item.superAdminOnly || isSuperAdmin) &&
                (item.page !== "marketplace" || marketplace != null)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.label} className="flex w-full flex-col gap-1.5 pt-1">
                <span className="hidden ps-2 text-caption-1-semibold uppercase tracking-wider text-text-tertiary sm:block">
                  {group.label}
                </span>
                <div className="flex w-full flex-col gap-1">
                  {filteredItems.map((item) => {
                    const selected = item.page !== undefined && item.page === page;
                    return (
                      <button
                        key={`${group.label}:${item.label}`}
                        type="button"
                        aria-label={item.label}
                        title={item.label}
                        aria-current={selected ? "page" : undefined}
                        onClick={
                          item.page
                            ? () => {
                                setPage(item.page!);
                                setContentScrolled(false);
                              }
                            : undefined
                        }
                        className={cx(
                          "flex w-full cursor-pointer items-center gap-2.5 rounded-xl p-2 text-start",
                          "outline-none transition-colors duration-150 ease focus-visible:ring-2 focus-visible:ring-accent-500",
                          selected
                            ? "bg-background-secondary-hover text-text-primary font-medium shadow-2xs"
                            : "hover:bg-background-secondary-hover/60 text-text-secondary hover:text-text-primary",
                        )}
                      >
                        <item.icon
                          className={cx(
                            "size-5 shrink-0 transition-colors",
                            selected ? "text-accent-600" : "text-text-tertiary"
                          )}
                          aria-hidden
                        />
                        <span className="hidden truncate text-body-2-medium sm:block">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Content pane */}
        <div className="flex min-w-0 flex-1 flex-col bg-background-primary-default">
          {page === "marketplace" && marketplace != null ? (
            marketplace
          ) : (
            <>
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between px-8 pt-8 pb-3 border-b border-separator-border/40">
                <div className="flex flex-col">
                  <h2 className="text-title-3-semibold text-text-primary">{PAGE_TITLES[page]}</h2>
                </div>
                <button
                  type="button"
                  aria-label="Close settings"
                  onClick={onClose}
                  className={cx(
                    "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full",
                    "bg-background-tertiary-default text-text-secondary hover:text-text-primary",
                    "transition-colors duration-150 ease hover:bg-background-secondary-hover",
                    "outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
                  )}
                >
                  <RiCloseLine className="size-4" aria-hidden />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="relative min-h-0 flex-1">
                <div
                  className="h-full overflow-y-auto px-8 py-6"
                  onScroll={(e) => setContentScrolled(e.currentTarget.scrollTop > 0)}
                >
                  {page === "profile" ? (
                    <SettingsProfile onSaved={showSavedToast} />
                  ) : page === "organization" ? (
                    <SettingsOrganization onSaved={showSavedToast} />
                  ) : page === "general" ? (
                    <SettingsGeneral planArtSrc={planArtSrc} onSaved={showSavedToast} />
                  ) : page === "appearance" ? (
                    <SettingsAppearance />
                  ) : page === "access" ? (
                    <SettingsAccess />
                  ) : page === "storage" ? (
                    <SettingsStorage />
                  ) : page === "tools" ? (
                    <SettingsTools />
                  ) : (
                    <SettingsProfile onSaved={showSavedToast} />
                  )}
                </div>

                {/* Progressive top fade */}
                <div
                  aria-hidden
                  className={cx(
                    "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background-primary-default to-transparent",
                    "transition-opacity duration-200 ease-out",
                    contentScrolled ? "opacity-100" : "opacity-0",
                  )}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Saved Toast Indicator */}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none absolute bottom-6 left-1/2 z-110 flex -translate-x-1/2 items-center gap-1.5",
          "rounded-full border border-border-button-default bg-background-primary-default py-1.5 pe-3 ps-2 shadow-xl",
          "transition-[opacity,transform,filter] duration-200 ease-out",
          savedPhase === "shown" && "translate-y-0 opacity-100 scale-100 blur-0",
          savedPhase === "hidden" && "translate-y-3 opacity-0 scale-95 blur-xs",
          savedPhase === "leaving" && "-translate-y-2 opacity-0 scale-95 blur-xs",
        )}
      >
        <RiCheckboxCircleFill className="size-4 shrink-0 text-accent-600" aria-hidden />
        <span className="text-body-2-medium text-text-primary">Saved</span>
      </div>
    </div>,
    document.body
  );
}
