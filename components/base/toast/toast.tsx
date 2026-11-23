"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useCallback,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiCloseLine,
  RiNotification3Line,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { useDirection } from "@/components/foundations/direction/direction";
import { cx } from "@/utils/cx";

export type ToastStatus = "success" | "error" | "information" | "neutral";
export type ToastId = string | number;

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface ToastAction {
  label: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export interface ToastOptions {
  id?: ToastId;
  description?: ReactNode;
  status?: ToastStatus;
  icon?: IconComponent;
  actions?: ToastAction[];
  duration?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
}

interface ToastRecord extends ToastOptions {
  id: ToastId;
  title: ReactNode;
  dismissed: boolean;
  createdAt: number;
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                     */
/* -------------------------------------------------------------------------- */

let toasts: ToastRecord[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function show(title: ReactNode, options: ToastOptions = {}): ToastId {
  const id = options.id ?? nextId++;
  const record: ToastRecord = {
    ...options,
    id,
    title,
    dismissed: false,
    createdAt: Date.now(),
  };

  const existing = toasts.findIndex((item) => item.id === id);
  if (existing >= 0) {
    toasts = toasts.map((item, index) => (index === existing ? record : item));
  } else {
    toasts = [...toasts, record];
  }
  emit();
  return id;
}

function remove(id: ToastId) {
  const record = toasts.find((item) => item.id === id);
  toasts = toasts.filter((item) => item.id !== id);
  emit();
  record?.onDismiss?.();
}

export function toast(title: ReactNode, options?: ToastOptions): ToastId {
  return show(title, options);
}

toast.success = (title: ReactNode, options?: Omit<ToastOptions, "status">) =>
  show(title, { ...options, status: "success" });

toast.error = (title: ReactNode, options?: Omit<ToastOptions, "status">) =>
  show(title, { ...options, status: "error" });

toast.info = (title: ReactNode, options?: Omit<ToastOptions, "status">) =>
  show(title, { ...options, status: "information" });

toast.update = (id: ToastId, options: ToastOptions & { title?: ReactNode }) => {
  const current = toasts.find((item) => item.id === id && !item.dismissed);
  if (!current) return;
  const { title = current.title, ...rest } = options;
  show(title, { ...current, ...rest, id });
};

toast.dismiss = (id?: ToastId) => {
  toasts = toasts.map((item) =>
    id === undefined || item.id === id ? { ...item, dismissed: true } : item
  );
  emit();
};

/* -------------------------------------------------------------------------- */
/*  Toast Item (Stacked Card)                                                 */
/* -------------------------------------------------------------------------- */

interface ToastItemProps {
  item: ToastRecord;
  index: number;
  total?: number;
  isHovered: boolean;
  yOffset: number;
  onHeightChange: (id: ToastId, height: number) => void;
  onDismiss: (id: ToastId) => void;
  defaultDuration: number;
}

const STATUS_ICONS: Record<ToastStatus, IconComponent> = {
  success: RiCheckboxCircleLine,
  error: RiErrorWarningLine,
  information: RiInformationLine,
  neutral: RiNotification3Line,
};

function ToastItem({
  item,
  index,
  total: _total,
  isHovered,
  yOffset,
  onHeightChange,
  onDismiss,
  defaultDuration,
}: ToastItemProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const status: ToastStatus = item.status ?? "neutral";
  const Icon = item.icon ?? STATUS_ICONS[status];
  const duration = item.duration ?? defaultDuration;
  const hasAutoDismiss = Number.isFinite(duration) && duration > 0;

  // Measure element height for dynamic stacking layout
  useEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    const update = () => {
      onHeightChange(item.id, el.offsetHeight);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [item.id, onHeightChange]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!hasAutoDismiss || item.dismissed) return;
    if (isHovered) return; // Pause timer on hover

    const timer = window.setTimeout(() => {
      onDismiss(item.id);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [hasAutoDismiss, item.dismissed, isHovered, duration, item.id, onDismiss]);

  // Stacking transform properties
  // index 0 = front (newest)
  const isFront = index === 0;
  const isSecond = index === 1;
  const isThird = index === 2;
  const isHidden = index > 2;

  // Spring positioning
  const scale = isHovered ? 1 : isFront ? 1 : isSecond ? 0.94 : isThird ? 0.88 : 0.82;
  const opacity = isHovered ? 1 : isHidden ? 0 : isFront ? 1 : isSecond ? 0.88 : 0.68;
  const zIndex = 60 - index;

  return (
    <motion.div
      ref={cardRef}
      layout="position"
      drag="x"
      dragConstraints={{ left: 0, right: 300 }}
      dragElastic={{ left: 0.05, right: 0.7 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80 || info.velocity.x > 300) {
          onDismiss(item.id);
        }
      }}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{
        opacity,
        y: yOffset,
        scale,
        transition: {
          type: "spring",
          stiffness: 420,
          damping: 32,
          mass: 0.8,
        },
      }}
      exit={{
        opacity: 0,
        y: 12,
        scale: 0.9,
        transition: { duration: 0.16, ease: "easeOut" },
      }}
      style={{
        zIndex,
        pointerEvents: isHidden && !isHovered ? "none" : "auto",
      }}
      className={cx(
        "absolute bottom-0 end-0 w-[356px] sm:w-[380px] max-w-[calc(100vw-32px)]",
        "bg-white/95 dark:bg-[#181C18]/95 backdrop-blur-md rounded-2xl",
        "border border-[#E4E8DD] dark:border-[#2C332A]",
        "shadow-[0_8px_30px_rgba(23,27,24,0.08),0_2px_6px_rgba(23,27,24,0.04)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.55)]",
        "p-3.5 pe-8 overflow-hidden select-none cursor-default"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon Indicator */}
        <div
          className={cx(
            "size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
            status === "success" &&
              "bg-[#EDF6D7] dark:bg-[#A5D632]/15 text-[#8DBA20] dark:text-[#A5D632] border border-[#A5D632]/35 dark:border-[#A5D632]/25",
            status === "error" &&
              "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40",
            status === "information" &&
              "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40",
            status === "neutral" &&
              "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="text-sm font-semibold text-[#171B18] dark:text-[#F3F5EE] leading-snug break-words">
            {item.title}
          </div>
          {item.description && (
            <div className="text-xs text-[#73796E] dark:text-[#A1A79B] mt-1 leading-relaxed break-words">
              {item.description}
            </div>
          )}

          {/* Action buttons */}
          {item.actions && item.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E4E8DD]/60 dark:border-[#2C332A]/60">
              {item.actions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    action.onClick?.();
                    onDismiss(item.id);
                  }}
                  className={cx(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                    action.variant === "primary"
                      ? "bg-[#A5D632] hover:bg-[#97C72A] text-[#171B18]"
                      : "bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary border border-border-button-default"
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      {item.dismissible !== false && (
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Close notification"
          className="absolute right-2.5 top-2.5 size-6 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8DBA20] cursor-pointer"
        >
          <RiCloseLine className="size-4" aria-hidden />
        </button>
      )}

      {/* Subtle Bottom Auto-dismiss Progress Indicator */}
      {hasAutoDismiss && (
        <span
          className={cx(
            "absolute inset-x-0 bottom-0 h-[2.5px] rounded-b-2xl origin-left",
            status === "success" && "bg-[#A5D632]",
            status === "error" && "bg-red-500",
            status === "information" && "bg-sky-500",
            status === "neutral" && "bg-[#A5D632]"
          )}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
            animationPlayState: isHovered ? "paused" : "running",
          }}
        />
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toaster (Portal & Stack Controller)                                       */
/* -------------------------------------------------------------------------- */

let owners: string[] = [];
const ownerListeners = new Set<() => void>();

function subscribeOwners(listener: () => void) {
  ownerListeners.add(listener);
  return () => {
    ownerListeners.delete(listener);
  };
}

export interface ToasterProps {
  limit?: number;
  duration?: number;
  className?: string;
  "aria-label"?: string;
}

export function Toaster({
  limit = 4,
  duration = 4500,
  className,
  "aria-label": ariaLabel = "Notifications",
}: ToasterProps) {
  const ownerId = useId();
  const direction = useDirection();
  const items = useSyncExternalStore(subscribe, () => toasts, () => toasts);
  const isOwner = useSyncExternalStore(subscribeOwners, () => owners[0] === ownerId, () => false);

  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [heights, setHeights] = useState<Record<string | number, number>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    owners = [...owners, ownerId];
    ownerListeners.forEach((l) => l());
    return () => {
      owners = owners.filter((id) => id !== ownerId);
      ownerListeners.forEach((l) => l());
    };
  }, [ownerId]);

  const handleHeightChange = useCallback((id: ToastId, h: number) => {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  const handleDismiss = useCallback((id: ToastId) => {
    remove(id);
  }, []);

  if (!mounted || !isOwner || typeof document === "undefined") return null;

  // Active un-dismissed toasts, latest on top (index 0)
  const activeToasts = items.filter((item) => !item.dismissed);
  const reversed = [...activeToasts].reverse().slice(0, limit);

  return createPortal(
    <div
      dir={direction}
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cx(
        "fixed end-4 bottom-4 sm:end-6 sm:bottom-6 z-[9999]",
        "pointer-events-none flex flex-col items-end w-[380px] max-w-[calc(100vw-32px)] h-0",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {reversed.map((item, index) => {
          // Calculate cumulative vertical offset when hovered, or card stack offset when collapsed
          let yOffset = 0;
          if (isHovered) {
            let offset = 0;
            for (let j = 0; j < index; j++) {
              const h = heights[reversed[j].id] || 64;
              offset += h + 10;
            }
            yOffset = -offset;
          } else {
            yOffset = -index * 14;
          }

          return (
            <ToastItem
              key={item.id}
              item={item}
              index={index}
              total={reversed.length}
              isHovered={isHovered}
              yOffset={yOffset}
              onHeightChange={handleHeightChange}
              onDismiss={handleDismiss}
              defaultDuration={duration}
            />
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
