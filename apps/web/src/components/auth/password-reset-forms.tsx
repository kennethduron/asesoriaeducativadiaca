"use client";

import { useActionState } from "react";
import Link from "next/link";

import { ActionFeedback } from "@/components/ui/action-feedback";
import { PasswordInput } from "@/components/ui/password-input";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import {
  confirmPasswordRecovery,
  requestPasswordReset,
  updatePassword,
  type PasswordState,
} from "@/lib/auth/actions";

const initial: PasswordState = {};

export function ConfirmPasswordRecoveryForm({
  tokenHash,
}: {
  tokenHash: string;
}) {
  return (
    <form action={confirmPasswordRecovery} className="mt-7 space-y-5">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value="recovery" />
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
        Confirma que deseas usar este enlace para definir una nueva contraseña.
      </p>
      <PendingSubmitButton
        idleLabel="Continuar con el restablecimiento"
        pendingLabel="Validando enlace…"
        className="h-12 w-full bg-[#0b2341] text-white"
      />
    </form>
  );
}

export function RequestPasswordResetForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initial,
  );
  return (
    <form action={action} className="mt-7 space-y-5">
      <ActionFeedback
        pending={pending}
        pendingMessage="Enviando enlace seguro…"
        status={state.status}
        message={state.message}
      />
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
        type="submit"
        disabled={pending}
        aria-busy={pending}
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
      <ActionFeedback
        pending={pending}
        pendingMessage="Actualizando contraseña…"
        status={state.status}
        message={state.message}
      />
      <label htmlFor="new-password" className="block text-sm font-semibold">
        Nueva contraseña
        <PasswordInput
          id="new-password"
          name="password"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
        />
      </label>
      <label
        htmlFor="new-password-confirmation"
        className="block text-sm font-semibold"
      >
        Confirmar contraseña
        <PasswordInput
          id="new-password-confirmation"
          name="confirmation"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
        />
      </label>
      <p className="text-xs text-slate-500">Usa al menos 8 caracteres.</p>
      {state.message ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-12 w-full rounded-xl bg-[#0b2341] font-semibold text-white"
      >
        {pending ? "Actualizando…" : "Actualizar y cerrar sesiones"}
      </button>
    </form>
  );
}
