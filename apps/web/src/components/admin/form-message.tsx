"use client";

import { ToastNotice } from "@/components/ui/toast-notice";
import type { FormState } from "@/lib/crm/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  const warning = state.status === "warning";
  return (
    <>
      <ToastNotice tone={warning ? "info" : "error"} message={state.message} />
      <div
        role={warning ? "status" : "alert"}
        aria-live="polite"
        className={`rounded-xl border p-4 text-sm ${warning ? "border-amber-300 bg-amber-50 text-amber-950" : "border-red-200 bg-red-50 text-red-800"}`}
      >
        <p className="font-semibold">{state.message}</p>
        {state.duplicates?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {state.duplicates.map((item) => (
              <li key={item.id}>
                {item.client_code} · {item.full_name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}

export function FieldError({
  state,
  name,
}: {
  state: FormState;
  name: string;
}) {
  const message = state.fieldErrors?.[name]?.[0];
  return message ? (
    <p className="mt-1 text-sm text-red-700">{message}</p>
  ) : null;
}
