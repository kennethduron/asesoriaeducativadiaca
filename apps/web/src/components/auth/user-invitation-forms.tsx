"use client";

import { useActionState } from "react";

import {
  completeUserInvitation,
  confirmUserInvitation,
  type InvitationState,
} from "@/lib/users/invitation-actions";

export function ConfirmUserInvitationForm({
  tokenHash,
}: {
  tokenHash: string;
}) {
  return (
    <form action={confirmUserInvitation} className="mt-7 space-y-5">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value="invite" />
      <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Confirma explícitamente que deseas aceptar esta invitación. Abrir esta
        página no ha consumido el enlace.
      </p>
      <button className="min-h-12 w-full rounded-xl bg-[#0b2341] px-5 font-semibold text-white">
        Aceptar invitación y continuar
      </button>
    </form>
  );
}

const initialState: InvitationState = {};

export function CompleteUserInvitationForm() {
  const [state, action, pending] = useActionState(
    completeUserInvitation,
    initialState,
  );
  return (
    <form action={action} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold text-slate-800">
        Crear contraseña
        <input
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Confirmar contraseña
        <input
          name="confirmation"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4"
        />
      </label>
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Usa entre 12 y 128 caracteres e incluye mayúscula, minúscula, número y
        símbolo.
      </div>
      {state.message ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-900"
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-[#0b2341] px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creando cuenta…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
