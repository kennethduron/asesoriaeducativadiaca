"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { login, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <label htmlFor="email" className="text-sm font-semibold text-slate-800">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={
            state.fieldErrors?.email ? "email-error" : undefined
          }
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="mt-2 text-sm text-red-700">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="password"
          className="text-sm font-semibold text-slate-800"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={
            state.fieldErrors?.password ? "password-error" : undefined
          }
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="mt-2 text-sm text-red-700">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div aria-live="polite" aria-atomic="true" className="min-h-6">
        {state.message ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b2341] px-5 font-semibold text-white transition hover:bg-[#12345e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight className="size-5" aria-hidden="true" />
        )}
        {pending ? "Verificando…" : "Ingresar"}
      </button>
    </form>
  );
}
