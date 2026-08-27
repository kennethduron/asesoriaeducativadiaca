"use client";

import { useActionState, useMemo, useState } from "react";

import { FieldError, FormMessage } from "@/components/admin/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/crm/form-state";
import { createChargeAction } from "@/lib/financial/actions";

type ServiceOption = {
  id: string;
  agreed_price: number | null;
  currency_code: string;
  custom_description: string | null;
  service_catalog: { name: string } | null;
};

export function ChargeForm({
  clientId,
  services,
}: {
  clientId: string;
  services: ServiceOption[];
}) {
  const [state, action, pending] = useActionState(
    createChargeAction,
    initialFormState,
  );
  const [serviceId, setServiceId] = useState("");
  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );
  const today = new Date().toISOString().slice(0, 10);
  const inputClass = "mt-2 h-11 bg-white";

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <input type="hidden" name="client_id" value={clientId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Servicio contratado opcional
          <select
            name="client_service_id"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">Sin servicio relacionado</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.service_catalog?.name ?? "Servicio"}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Concepto
          <Input
            key={`concept-${serviceId}`}
            name="concept"
            required
            maxLength={200}
            defaultValue={
              selectedService?.custom_description ||
              selectedService?.service_catalog?.name ||
              ""
            }
            className={inputClass}
            aria-invalid={Boolean(state.fieldErrors?.concept)}
          />
          <FieldError state={state} name="concept" />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Fecha del cargo
          <Input
            name="charge_date"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Vencimiento opcional
          <Input name="due_date" type="date" className={inputClass} />
          <FieldError state={state} name="due_date" />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Monto
          <Input
            key={`amount-${serviceId}`}
            name="amount"
            required
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={selectedService?.agreed_price ?? ""}
            className="mt-2 h-12 bg-white text-lg font-semibold"
            aria-describedby="charge-money-help"
          />
          <span
            id="charge-money-help"
            className="mt-1 block text-xs text-slate-500"
          >
            El cargo se registra explícitamente; no nace del servicio por sí
            solo.
          </span>
          <FieldError state={state} name="amount" />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Moneda
          <select
            key={`currency-${serviceId}`}
            name="currency_code"
            defaultValue={selectedService?.currency_code ?? "HNL"}
            className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
          >
            <option value="HNL">HNL — Lempira</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Referencia
          <Input name="reference" maxLength={120} className={inputClass} />
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
          Observaciones
          <Textarea
            name="notes"
            maxLength={1000}
            className="mt-2 min-h-28 bg-white"
          />
        </label>
      </div>
      <button
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2341] px-5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Registrando cargo…" : "Registrar cargo"}
      </button>
    </form>
  );
}
