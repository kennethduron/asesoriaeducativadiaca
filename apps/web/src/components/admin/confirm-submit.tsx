"use client";

import { useState } from "react";

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
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {children}
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl">
          <p className="text-sm leading-6">{message}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
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
