"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";
import { useEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react";
import { cx } from "@/utils/cx";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "boardui:theme";
export const THEME_CHANGE_EVENT = "boardui:theme-change";

const THEME_TRANSITION_DURATION = 820;
const THEME_TRANSITION_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const THEME_TRANSITION_STYLE_ID = "boardui-theme-transition-style";

type ThemeTransitionOrigin = { x: number; y: number };

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

let themeTransitionRunning = false;

export const THEME_OPTIONS = [
  { mode: "system" as const, label: "System", Icon: RiComputerLine },
  { mode: "light" as const, label: "Light", Icon: RiSunLine },
  { mode: "dark" as const, label: "Dark", Icon: RiMoonLine },
] as const;

function createBlurCircleMask() {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    '<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%">',
    '<feGaussianBlur stdDeviation="2" /></filter></defs>',
    '<circle cx="50" cy="50" r="42" fill="white" filter="url(#blur)" />',
    "</svg>",
  ].join("");

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function installThemeTransitionStyle(
  { x, y }: ThemeTransitionOrigin,
  radius: number,
  duration: number,
) {
  document.getElementById(THEME_TRANSITION_STYLE_ID)?.remove();

  const mask = createBlurCircleMask();
  const finalMaskSize = radius * 2.5;
  const finalMaskX = x - finalMaskSize / 2;
  const finalMaskY = y - finalMaskSize / 2;
  const style = document.createElement("style");
  style.id = THEME_TRANSITION_STYLE_ID;
  style.textContent = `
    ::view-transition-new(root) {
      -webkit-mask-image: ${mask};
      mask-image: ${mask};
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      animation: boardui-theme-mask-reveal ${duration}ms ${THEME_TRANSITION_EASING} both;
      transform-origin: ${x}px ${y}px;
      will-change: -webkit-mask-size, -webkit-mask-position, mask-size, mask-position;
    }

    @keyframes boardui-theme-mask-reveal {
      from {
        -webkit-mask-position: ${x}px ${y}px;
        mask-position: ${x}px ${y}px;
        -webkit-mask-size: 0px 0px;
        mask-size: 0px 0px;
      }
      to {
        -webkit-mask-position: ${finalMaskX}px ${finalMaskY}px;
        mask-position: ${finalMaskX}px ${finalMaskY}px;
        -webkit-mask-size: ${finalMaskSize}px ${finalMaskSize}px;
        mask-size: ${finalMaskSize}px ${finalMaskSize}px;
      }
    }
  `;
  document.head.appendChild(style);
  return style;
}

export function resolveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function storedTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const val = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
    return "system";
  } catch {
    return "system";
  }
}

let currentModeState: ThemeMode = typeof window !== "undefined" ? storedTheme() : "system";

export function applyTheme(theme: ThemeMode, { persist = true }: { persist?: boolean } = {}) {
  if (typeof document === "undefined") return;
  currentModeState = theme;
  const effective = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", effective === "dark");
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The control remains usable when storage is blocked or unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

function elementCenter(element: HTMLElement | null): ThemeTransitionOrigin {
  if (!element) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function normalizedOrigin(
  origin: ThemeTransitionOrigin | null,
  element: HTMLElement | null,
): ThemeTransitionOrigin {
  const fallback = elementCenter(element);
  const x = origin?.x ?? fallback.x;
  const y = origin?.y ?? fallback.y;
  return {
    x: Math.min(Math.max(x, 0), window.innerWidth),
    y: Math.min(Math.max(y, 0), window.innerHeight),
  };
}

/**
 * Reveals the next theme from the interaction point using the View Transition
 * API. Keyboard activation starts at the control's center. Unsupported
 * browsers and reduced-motion users receive the same immediate theme change.
 */
export async function applyThemeWithTransition(
  theme: ThemeMode,
  {
    origin = null,
    element = null,
    duration = THEME_TRANSITION_DURATION,
  }: {
    origin?: ThemeTransitionOrigin | null;
    element?: HTMLElement | null;
    duration?: number;
  } = {},
) {
  if (typeof document === "undefined") return;

  const currentEffective = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const targetEffective = resolveTheme(theme);

  // If visual appearance will not change, apply mode state directly
  if (currentEffective === targetEffective) {
    applyTheme(theme);
    return;
  }

  const transitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!transitionDocument.startViewTransition || reduceMotion) {
    applyTheme(theme);
    return;
  }
  if (themeTransitionRunning) return;

  const { x, y } = normalizedOrigin(origin, element);
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  themeTransitionRunning = true;
  document.documentElement.classList.add("theme-transitioning");
  const transitionStyle = installThemeTransitionStyle({ x, y }, radius, duration);
  try {
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => applyTheme(theme));
    });

    await transition.ready;
    await transition.finished;
  } catch {
    // If the browser aborts a transition mid-flight, the theme still changes.
    applyTheme(theme);
  } finally {
    transitionStyle.remove();
    document.documentElement.classList.remove("theme-transitioning");
    themeTransitionRunning = false;
  }
}

function subscribe(onStoreChange: () => void) {
  const onThemeChange = (event: Event) => {
    const custom = event as CustomEvent<ThemeMode>;
    if (custom.detail) {
      currentModeState = custom.detail;
    } else {
      currentModeState = storedTheme();
    }
    onStoreChange();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const val = (event.newValue as ThemeMode) || "system";
    currentModeState = val === "light" || val === "dark" || val === "system" ? val : "system";
    const effective = resolveTheme(currentModeState);
    document.documentElement.classList.toggle("dark", effective === "dark");
    onStoreChange();
  };

  const mediaQuery =
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  const onSystemChange = (e: MediaQueryListEvent) => {
    if (currentModeState === "system") {
      document.documentElement.classList.toggle("dark", e.matches);
      onStoreChange();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener("storage", onStorage);
  mediaQuery?.addEventListener("change", onSystemChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener("storage", onStorage);
    mediaQuery?.removeEventListener("change", onSystemChange);
  };
}

function getSnapshot(): ThemeMode {
  return currentModeState;
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface ThemeToggleProps {
  /** Compact icon-only treatment for a collapsed sidebar rail. */
  collapsed?: boolean;
  /** Visual treatment for the control. */
  appearance?: "sidebar" | "segmented" | "sidebar-segmented" | "glass-segmented";
  className?: string;
  /** Size of segmented controls; small fits inside dropdown rows or headers. */
  size?: "small" | "medium";
  /** Circular reveal duration in milliseconds. */
  transitionDuration?: number;
  /** Label displayed inline with the pill control (defaults to "Theme" in sidebar appearance). Set to null or false to hide. */
  label?: string | null | false;
}

/**
 * Compact 3-option theme toggle switch (System, Light, Dark).
 * Renders inline with its label with smooth sliding circle indicator.
 */
export function ThemeToggle({
  collapsed = false,
  appearance = "sidebar",
  className,
  size: _size = "small",
  transitionDuration = THEME_TRANSITION_DURATION,
  label,
}: ThemeToggleProps) {
  const localize = useTemplateCopy();
  const theme = useThemeMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = storedTheme();
    currentModeState = initial;
    applyTheme(initial, { persist: false });
  }, []);

  // ── Collapsed Sidebar Rail Treatment ──
  if (collapsed) {
    const activeOption = THEME_OPTIONS.find((opt) => opt.mode === theme) || THEME_OPTIONS[0];
    const ActiveIcon = activeOption.Icon;
    const nextModeMap: Record<ThemeMode, ThemeMode> = {
      system: "light",
      light: "dark",
      dark: "system",
    };
    const nextMode = nextModeMap[theme] || "system";
    const nextOption = THEME_OPTIONS.find((opt) => opt.mode === nextMode) || THEME_OPTIONS[0];

    return localize((
      <button
        type="button"
        aria-label={`Theme: ${activeOption.label}. Click to switch to ${nextOption.label}`}
        title={`Theme: ${activeOption.label} (Click to switch to ${nextOption.label})`}
        onClick={(event) => {
          const pointerOrigin =
            event.clientX === 0 && event.clientY === 0
              ? null
              : { x: event.clientX, y: event.clientY };
          void applyThemeWithTransition(nextMode, {
            origin: pointerOrigin,
            element: event.currentTarget,
            duration: transitionDuration,
          });
        }}
        className={cx(
          "flex size-8 cursor-pointer items-center justify-center rounded-full",
          "border border-border-button-default bg-background-secondary-default",
          "text-foreground-icon-secondary transition-colors duration-150 ease",
          "hover:bg-background-secondary-hover hover:text-foreground-icon-primary shadow-2xs",
          "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          className,
        )}
      >
        <ActiveIcon className="size-4" aria-hidden />
      </button>
    ));
  }

  // ── Glass Treatment for Landing Navigation ──
  if (appearance === "glass-segmented") {
    return localize((
      <div
        role="radiogroup"
        aria-label="Theme selection"
        className={cx(
          "relative inline-flex items-center gap-0.5 rounded-full p-0.5 z-10 bg-transparent",
          className,
        )}
      >
        {THEME_OPTIONS.map(({ mode, label: optionLabel, Icon }) => {
          const selected = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${optionLabel} theme`}
              title={`${optionLabel} theme`}
              onClick={(event) => {
                if (selected) return;
                const pointerOrigin =
                  event.clientX === 0 && event.clientY === 0
                    ? null
                    : { x: event.clientX, y: event.clientY };
                void applyThemeWithTransition(mode, {
                  origin: pointerOrigin,
                  element: event.currentTarget,
                  duration: transitionDuration,
                });
              }}
              className={cx(
                "relative z-10 grid size-6 cursor-pointer place-items-center rounded-full outline-none transition-colors duration-150",
                selected
                  ? "bg-white text-black shadow-xs dark:bg-[#2e2e33] dark:text-white"
                  : "text-black/45 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          );
        })}
      </div>
    ));
  }

  // ── Compact Pill Track ──
  const pillTrack = (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="relative inline-flex items-center gap-0.5 rounded-full p-0.5 bg-background-secondary-default border border-border-button-default shadow-2xs select-none shrink-0"
    >
      {/* Sliding Circular Indicator Thumb (24px size, 26px step) */}
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute top-0.5 start-0.5 size-6 rounded-full",
          "bg-background-primary-default border border-border-button-default/80 shadow-xs",
          mounted && "transition-transform duration-200 ease-out",
          theme === "system" && "translate-x-0 rtl:translate-x-0",
          theme === "light" && "translate-x-[26px] rtl:-translate-x-[26px]",
          theme === "dark" && "translate-x-[52px] rtl:-translate-x-[52px]",
        )}
      />

      {THEME_OPTIONS.map(({ mode, label: optionLabel, Icon }) => {
        const selected = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${optionLabel} theme`}
            title={`${optionLabel} mode`}
            onClick={(event) => {
              if (selected) return;
              const pointerOrigin =
                event.clientX === 0 && event.clientY === 0
                  ? null
                  : { x: event.clientX, y: event.clientY };
              void applyThemeWithTransition(mode, {
                origin: pointerOrigin,
                element: event.currentTarget,
                duration: transitionDuration,
              });
            }}
            className={cx(
              "relative z-10 grid size-6 cursor-pointer place-items-center rounded-full outline-none transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              selected
                ? "text-text-primary font-semibold"
                : "text-text-tertiary hover:text-text-primary",
            )}
          >
            <Icon className="size-3.5 shrink-0 transition-colors" aria-hidden />
          </button>
        );
      })}
    </div>
  );

  // ── Inline Treatment with Label (Default in Sidebar) ──
  const resolvedLabel =
    label !== undefined
      ? label
      : appearance === "sidebar"
        ? "Theme"
        : null;

  if (resolvedLabel) {
    return localize((
      <div className={cx("flex items-center justify-between w-full px-1 py-0.5", className)}>
        <span className="text-body-2-medium text-text-secondary select-none font-medium">
          {resolvedLabel}
        </span>
        {pillTrack}
      </div>
    ));
  }

  return localize(pillTrack);
}
