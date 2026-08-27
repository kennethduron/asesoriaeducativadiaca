"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <div className="relative mt-2">
      <Input
        {...props}
        ref={inputRef}
        type={visible ? "text" : "password"}
        className={cn("h-12 pr-12", className)}
      />
      <button
        type="button"
        aria-label={label}
        aria-pressed={visible}
        title={label}
        onClick={() => {
          setVisible((current) => !current);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="absolute inset-y-0 right-0 grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-r-xl text-slate-600 outline-none transition hover:bg-amber-50 hover:text-[#0b2341] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 active:bg-amber-100"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden="true" />
        ) : (
          <Eye className="size-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
