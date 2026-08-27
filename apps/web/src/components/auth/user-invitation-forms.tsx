"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/ui/action-feedback";
import { PasswordInput } from "@/components/ui/password-input";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
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
      <PendingSubmitButton
        idleLabel="Aceptar invitación y continuar"
        pendingLabel="Validando invitación…"
        className="min-h-12 w-full bg-[#0b2341] text-white"
      />
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
      <ActionFeedback
        pending={pending}
        pendingMessage="Creando cuenta…"
        status="error"
        message={state.message}
      />
      <label
        htmlFor="invitation-password"
        className="block text-sm font-semibold text-slate-800"
      >
        Crear contraseña
        <PasswordInput
          id="invitation-password"
          name="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label
        htmlFor="invitation-confirmation"
        className="block text-sm font-semibold text-slate-800"
      >
        Confirmar contraseña
        <PasswordInput
          id="invitation-confirmation"
          name="confirmation"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Usa al menos 8 caracteres.
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
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-12 w-full rounded-xl bg-[#0b2341] px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creando cuenta…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
