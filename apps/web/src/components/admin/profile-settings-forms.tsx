"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import { ActionFeedback } from "@/components/ui/action-feedback";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  updateMyPassword,
  updateMyUsername,
  type ProfileActionState,
} from "@/lib/profile/actions";

const initial: ProfileActionState = {};

export function UsernameForm({ username }: { username: string | null }) {
  const [state, action, pending] = useActionState(updateMyUsername, initial);
  return (
    <form action={action} className="space-y-4">
      <ActionFeedback
        pending={pending}
        pendingMessage="Guardando nombre de usuario…"
        status={state.status}
        message={state.message}
      />
      <label htmlFor="profile-username" className="block text-sm font-semibold">
        Nombre de usuario
      </label>
      <Input
        id="profile-username"
        name="username"
        required
        minLength={3}
        maxLength={30}
        pattern="[A-Za-z0-9._-]{3,30}"
        autoCapitalize="none"
        spellCheck={false}
        autoComplete="username"
        defaultValue={username ?? ""}
      />
      <p className="text-sm leading-6 text-slate-600">
        Puedes usar tu correo o este nombre de usuario para iniciar sesión. Usa
        3–30 caracteres: letras, números, punto, guion o guion bajo.
      </p>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b2341] px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {pending ? "Guardando…" : "Guardar nombre de usuario"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(updateMyPassword, initial);
  return (
    <form action={action} className="space-y-4">
      <ActionFeedback
        pending={pending}
        pendingMessage="Actualizando contraseña…"
        status={state.status}
        message={state.message}
      />
      <div>
        <label htmlFor="profile-password" className="text-sm font-semibold">
          Nueva contraseña
        </label>
        <PasswordInput
          id="profile-password"
          name="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label
          htmlFor="profile-password-confirmation"
          className="text-sm font-semibold"
        >
          Confirmar contraseña
        </label>
        <PasswordInput
          id="profile-password-confirmation"
          name="confirmation"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </div>
      <p className="text-sm text-slate-600">Usa al menos 8 caracteres.</p>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b2341] px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {pending ? "Actualizando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
