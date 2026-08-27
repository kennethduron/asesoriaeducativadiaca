"use client";

import { useEffect, useId, useRef, useState } from "react";

export function ConfirmSubmit({
  action,
  hidden,
  message,
  children,
  triggerClassName,
}: {
  action: (data: FormData) => Promise<void>;
  hidden: Record<string, string>;
  message: string;
  children: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {children}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Confirmar acción"
          className="absolute top-full right-0 z-10 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl"
        >
          <p className="text-sm leading-6">{message}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            >
              Cancelar
            </button>
            <form action={action}>
              {Object.entries(hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <button className="min-h-11 w-full rounded-lg bg-[#0b2341] px-3 text-sm font-semibold text-white">
                Confirmar
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
