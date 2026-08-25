"use client";

import { useActionState, useRef } from "react";

import { FormMessage } from "@/components/admin/form-message";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState, type FormState } from "@/lib/crm/form-state";

export function FinancialOperationDialog({
  action,
  hiddenName,
  hiddenValue,
  triggerLabel,
  title,
  description,
  confirmLabel,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  hiddenName: string;
  hiddenValue: string;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex min-h-11 items-center rounded-xl border border-red-300 px-4 font-semibold text-red-800 hover:bg-red-50"
      >
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${hiddenName}-title`}
        aria-describedby={`${hiddenName}-description`}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-950/50"
      >
        <form action={formAction} className="overflow-y-auto p-5 sm:p-6">
          <h2 id={`${hiddenName}-title`} className="text-xl font-semibold">
            {title}
          </h2>
          <p
            id={`${hiddenName}-description`}
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            {description}
          </p>
          <div className="mt-4">
            <FormMessage state={state} />
          </div>
          <input type="hidden" name={hiddenName} value={hiddenValue} />
          <label className="mt-5 block text-sm font-semibold text-slate-800">
            Motivo
            <Textarea
              name="reason"
              required
              minLength={3}
              maxLength={500}
              className="mt-2 min-h-28"
              aria-describedby={`${hiddenName}-reason-help`}
            />
            <span
              id={`${hiddenName}-reason-help`}
              className="mt-1 block text-xs text-slate-500"
            >
              Quedará registrado en la auditoría.
            </span>
          </label>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold"
            >
              Volver
            </button>
            <button
              disabled={pending}
              className="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Procesando…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
