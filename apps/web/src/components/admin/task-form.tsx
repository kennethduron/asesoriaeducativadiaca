"use client";

import { useActionState, useMemo, useState } from "react";

import { FieldError, FormMessage } from "@/components/admin/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/crm/form-state";
import { createTaskAction, updateTaskAction } from "@/lib/tasks/actions";

type Options = Awaited<
  ReturnType<typeof import("@/lib/tasks/queries").getTaskFormOptions>
>;
type InitialTask = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  client_service_id: string | null;
  assigned_to: string;
  priority: string;
  due_at: string;
};

const reminderOptions = [
  [0, "A la hora"],
  [15, "15 minutos antes"],
  [30, "30 minutos antes"],
  [60, "1 hora antes"],
  [180, "3 horas antes"],
  [1440, "1 día antes"],
  [2880, "2 días antes"],
  [10080, "1 semana antes"],
] as const;

function hondurasLocal(iso?: string) {
  const date = iso ? new Date(iso) : new Date(Date.now() + 86_400_000);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

export function TaskForm({
  options,
  initial,
  currentUserId,
}: {
  options: Options;
  initial?: InitialTask;
  currentUserId: string;
}) {
  const action = initial
    ? updateTaskAction.bind(null, initial.id)
    : createTaskAction;
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const services = useMemo(
    () => options.services.filter((service) => service.client_id === clientId),
    [clientId, options.services],
  );
  const inputClass = "mt-2 h-11 bg-white";
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Título
          <Input
            name="title"
            required
            maxLength={160}
            defaultValue={initial?.title}
            className={inputClass}
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError state={state} name="title" />
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Descripción
          <Textarea
            name="description"
            maxLength={4000}
            defaultValue={initial?.description ?? ""}
            className="mt-2 min-h-28 bg-white"
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Cliente opcional
          <select
            name="client_id"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">Sin cliente relacionado</option>
            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.client_code} · {client.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Servicio opcional
          <select
            name="client_service_id"
            defaultValue={initial?.client_service_id ?? ""}
            disabled={!clientId}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 disabled:bg-slate-100"
          >
            <option value="">Sin servicio relacionado</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.service_catalog?.name ?? "Servicio"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Responsable
          <select
            name="assigned_to"
            required
            defaultValue={initial?.assigned_to ?? currentUserId}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            {options.assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} · {user.role_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Prioridad
          <select
            name="priority"
            defaultValue={initial?.priority ?? "normal"}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="low">Baja</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Fecha y hora · America/Tegucigalpa
          <Input
            name="due_local"
            type="datetime-local"
            required
            defaultValue={hondurasLocal(initial?.due_at)}
            className={inputClass}
          />
          <FieldError state={state} name="due_local" />
        </label>
      </div>
      {!initial ? (
        <fieldset className="rounded-2xl border border-slate-200 p-4">
          <legend className="px-2 font-semibold">Recordatorios</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {reminderOptions.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm"
              >
                <input type="checkbox" name="reminder_minutes" value={value} />{" "}
                {label}
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Fecha y hora personalizada opcional · America/Tegucigalpa
            <Input
              name="custom_remind_local"
              type="datetime-local"
              className={inputClass}
              aria-invalid={Boolean(state.fieldErrors?.custom_remind_local)}
            />
            <FieldError state={state} name="custom_remind_local" />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4">
              <input type="checkbox" name="channel_push" /> Push
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4">
              <input type="checkbox" name="channel_email" /> Email
            </label>
          </div>
          <FieldError state={state} name="reminder_minutes" />
        </fieldset>
      ) : null}
      <button
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2341] px-5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : initial ? "Guardar cambios" : "Crear tarea"}
      </button>
    </form>
  );
}
