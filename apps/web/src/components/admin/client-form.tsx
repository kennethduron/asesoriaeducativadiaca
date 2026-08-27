"use client";

import { useActionState } from "react";

import { FieldError, FormMessage } from "@/components/admin/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState, type FormState } from "@/lib/crm/form-state";

type ClientValue = {
  full_name?: string;
  client_type?: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  status?: string;
  registered_on?: string;
  notes_summary?: string | null;
  updated_at?: string;
};

export function ClientForm({
  action,
  value,
  submitLabel,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  value?: ClientValue;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const inputClass = "mt-2 h-11 bg-white";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      {value?.updated_at ? (
        <input
          type="hidden"
          name="expected_updated_at"
          value={value.updated_at}
        />
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Nombre completo
          <Input
            name="full_name"
            required
            maxLength={160}
            defaultValue={value?.full_name}
            className={inputClass}
            aria-invalid={Boolean(state.fieldErrors?.full_name)}
          />
          <FieldError state={state} name="full_name" />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Tipo
          <select
            name="client_type"
            defaultValue={value?.client_type ?? "individual"}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="individual">Persona</option>
            <option value="business">Empresa</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Estado
          <select
            name="status"
            defaultValue={value?.status ?? "active"}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Correo
          <Input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={value?.email ?? ""}
            className={inputClass}
          />
          <FieldError state={state} name="email" />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Teléfono
          <Input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={value?.phone ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          WhatsApp
          <Input
            name="whatsapp"
            type="tel"
            maxLength={40}
            defaultValue={value?.whatsapp ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Fecha de registro
          <Input
            name="registered_on"
            type="date"
            required
            defaultValue={value?.registered_on ?? today}
            className={inputClass}
          />
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Dirección
          <Input
            name="address"
            maxLength={300}
            defaultValue={value?.address ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Ciudad
          <Input
            name="city"
            maxLength={100}
            defaultValue={value?.city ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          País
          <Input
            name="country"
            maxLength={100}
            defaultValue={value?.country ?? "Honduras"}
            className={inputClass}
          />
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Resumen interno
          <Textarea
            name="notes_summary"
            maxLength={1000}
            defaultValue={value?.notes_summary ?? ""}
            className="mt-2 min-h-28 bg-white"
          />
        </label>
      </div>
      {state.status === "warning" ? (
        <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <input
            type="checkbox"
            name="confirm_duplicate"
            value="yes"
            required
            className="mt-1 size-4"
          />
          Confirmo que revisé las coincidencias y que se trata de un cliente
          distinto.
        </label>
      ) : null}
      <button
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2341] px-5 font-semibold text-white hover:bg-[#17365d] disabled:opacity-60"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
