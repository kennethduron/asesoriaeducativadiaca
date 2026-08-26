"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  requestPasswordReset,
  updatePassword,
  type PasswordState,
} from "@/lib/auth/actions";

const initial: PasswordState = {};
export function RequestPasswordResetForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initial,
  );
  return (
    <form action={action} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold">
        Correo autorizado
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4"
        />
      </label>
      {state.message ? (
        <p
          role="status"
          className={`rounded-xl p-3 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="h-12 w-full rounded-xl bg-[#0b2341] font-semibold text-white"
      >
        {pending ? "Enviando…" : "Enviar enlace seguro"}
      </button>
      <Link
        href="/login"
        className="flex min-h-11 items-center justify-center font-semibold text-[#17365d]"
      >
        Volver al acceso
      </Link>
    </form>
  );
}
export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold">
        Nueva contraseña
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={12}
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4"
        />
      </label>
      <label className="block text-sm font-semibold">
        Confirmar contraseña
        <input
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          minLength={12}
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4"
        />
      </label>
      <p className="text-xs text-slate-500">
        Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.
      </p>
      {state.message ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="h-12 w-full rounded-xl bg-[#0b2341] font-semibold text-white"
      >
        {pending ? "Actualizando…" : "Actualizar y cerrar sesiones"}
      </button>
    </form>
  );
}
