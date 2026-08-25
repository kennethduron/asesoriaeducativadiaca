"use client";

import { useActionState } from "react";

import { FieldError, FormMessage } from "@/components/admin/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addClientNoteAction, addClientServiceAction } from "@/lib/crm/actions";
import { initialFormState } from "@/lib/crm/form-state";

export function NoteForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(
    addClientNoteAction,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="client_id" value={clientId} />
      <label className="block text-sm font-semibold text-slate-800">
        Nueva nota
        <Textarea
          name="note"
          required
          maxLength={5000}
          className="mt-2 min-h-28"
          placeholder="Escribe una nota interna en texto plano…"
        />
      </label>
      <FieldError state={state} name="note" />
      <FormMessage state={state} />
      <button
        disabled={pending}
        className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar nota"}
      </button>
    </form>
  );
}

type ServiceOption = {
  id: string;
  name: string;
  service_categories: { name: string } | null;
};

export function ClientServiceForm({
  clientId,
  services,
}: {
  clientId: string;
  services: ServiceOption[];
}) {
  const [state, action, pending] = useActionState(
    addClientServiceAction,
    initialFormState,
  );
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="client_id" value={clientId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-semibold">
          Servicio
          <select
            name="service_id"
            required
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">Seleccionar…</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.service_categories?.name} · {service.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 text-sm font-semibold">
          Descripción personalizada
          <Textarea
            name="custom_description"
            maxLength={1000}
            className="mt-2 min-h-24"
          />
        </label>
        <label className="text-sm font-semibold">
          Inicio
          <Input
            name="start_date"
            type="date"
            required
            defaultValue={today}
            className="mt-2 h-11"
          />
        </label>
        <label className="text-sm font-semibold">
          Fin
          <Input name="end_date" type="date" className="mt-2 h-11" />
          <FieldError state={state} name="end_date" />
        </label>
        <label className="text-sm font-semibold">
          Precio acordado
          <Input
            name="agreed_price"
            type="number"
            min="0.01"
            step="0.01"
            className="mt-2 h-11"
          />
        </label>
        <label className="text-sm font-semibold">
          Moneda
          <Input
            name="currency_code"
            defaultValue="HNL"
            maxLength={3}
            required
            className="mt-2 h-11"
          />
        </label>
        <label className="text-sm font-semibold">
          Modalidad
          <select
            name="billing_mode"
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">Sin definir</option>
            <option value="one_time">Una vez</option>
            <option value="monthly">Mensual</option>
            <option value="custom">Personalizada</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Estado
          <select
            name="status"
            defaultValue="pending"
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="pending">Pendiente</option>
            <option value="active">Activo</option>
            <option value="suspended">Suspendido</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Registrar un servicio no genera una cuenta por cobrar.
      </p>
      <button
        disabled={pending}
        className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar servicio"}
      </button>
    </form>
  );
}
