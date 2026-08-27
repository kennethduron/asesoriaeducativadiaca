"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, CircleAlert, Info, LoaderCircle, X } from "lucide-react";

type ToastTone = "loading" | "success" | "error" | "info";
type ToastItem = { id: string; tone: ToastTone; message: string };
type ToastInput = Omit<ToastItem, "id"> & {
  id?: string;
  duration?: number | null;
};

type ToastContextValue = {
  notify: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    ({ id, tone, message, duration }: ToastInput) => {
      const toastId = id ?? `toast-${++nextId.current}`;
      setItems((current) => [
        ...current.filter((item) => item.id !== toastId),
        { id: toastId, tone, message },
      ]);
      const timeout = duration === undefined ? 2400 : duration;
      if (timeout !== null && timeout > 0)
        window.setTimeout(() => dismiss(toastId), timeout);
      return toastId;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 z-[100] flex flex-col items-center gap-2 sm:right-5 sm:left-auto sm:w-[min(24rem,calc(100vw-2.5rem))] sm:items-stretch">
        {items.map((item) => {
          const Icon =
            item.tone === "loading"
              ? LoaderCircle
              : item.tone === "success"
                ? CheckCircle2
                : item.tone === "error"
                  ? CircleAlert
                  : Info;
          return (
            <div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              aria-live={item.tone === "error" ? "assertive" : "polite"}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-xl"
            >
              <Icon
                className={`size-5 shrink-0 ${item.tone === "loading" ? "animate-spin text-amber-600" : item.tone === "success" ? "text-emerald-600" : item.tone === "error" ? "text-red-600" : "text-blue-600"}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 font-medium">{item.message}</span>
              {item.tone !== "loading" ? (
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Cerrar notificación"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
