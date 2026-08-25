"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { FormMessage } from "@/components/admin/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/crm/form-state";
import { confirmPaymentAction } from "@/lib/financial/actions";
import {
  allocateOldest,
  centsToMoney,
  formatMoney,
  moneyToCents,
} from "@/lib/financial/money";

type OpenCharge = {
  charge_id: string | null;
  concept: string | null;
  charge_date: string | null;
  due_date: string | null;
  remaining_amount: number | null;
  currency_code: string | null;
  derived_status: string | null;
};

export function PaymentForm({
  client,
  charges,
  methods,
  idempotencyKey,
}: {
  client: { id: string; client_code: string; full_name: string };
  charges: OpenCharge[];
  methods: { id: string; code: string; name: string }[];
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState(
    confirmPaymentAction,
    initialFormState,
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const currency = charges[0]?.currency_code ?? "HNL";
  const validCharges = charges.filter(
    (
      charge,
    ): charge is OpenCharge & { charge_id: string; remaining_amount: number } =>
      Boolean(charge.charge_id) && charge.remaining_amount !== null,
  );
  const totals = useMemo(() => {
    try {
      const payment = paymentAmount ? moneyToCents(paymentAmount) : 0n;
      const applied = Object.values(allocations).reduce(
        (sum, value) => sum + (value ? moneyToCents(value) : 0n),
        0n,
      );
      return {
        payment,
        applied,
        unapplied: payment - applied,
        valid: applied <= payment,
      };
    } catch {
      return { payment: 0n, applied: 0n, unapplied: 0n, valid: false };
    }
  }, [allocations, paymentAmount]);
  const allocationPayload = validCharges
    .map((charge) => ({
      charge_id: charge.charge_id,
      amount: allocations[charge.charge_id] || "0.00",
    }))
    .filter((item) => {
      try {
        return moneyToCents(item.amount) > 0n;
      } catch {
        return false;
      }
    });

  function autoAllocate() {
    try {
      const result = allocateOldest(
        paymentAmount,
        validCharges.map((charge) => ({
          id: charge.charge_id,
          remaining_amount: charge.remaining_amount,
        })),
      );
      setAllocations(
        Object.fromEntries(result.map((item) => [item.charge_id, item.amount])),
      );
    } catch {
      setAllocations({});
    }
  }

  return (
    <>
      <form
        id="payment-confirmation-form"
        action={action}
        className="space-y-7"
      >
        <FormMessage state={state} />
        <input type="hidden" name="client_id" value={client.id} />
        <input type="hidden" name="currency_code" value={currency} />
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <input
          type="hidden"
          name="allocations_json"
          value={JSON.stringify(allocationPayload)}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
            Cliente
          </p>
          <h2 className="mt-2 text-xl font-semibold">{client.full_name}</h2>
          <p className="mt-1 font-mono text-sm text-slate-500">
            {client.client_code}
          </p>
        </section>

        <section
          aria-labelledby="payment-data"
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 id="payment-data" className="text-lg font-semibold">
            Datos del pago
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-800">
              Fecha
              <Input
                name="payment_date"
                type="date"
                required
                defaultValue={today}
                className="mt-2 h-11"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Método
              <select
                name="payment_method_id"
                required
                className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              >
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Monto {currency}
              <Input
                name="amount"
                required
                inputMode="decimal"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className="mt-2 h-14 text-xl font-semibold"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Referencia
              <Input
                name="reference_number"
                maxLength={120}
                className="mt-2 h-11"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Banco opcional
              <Input name="bank_name" maxLength={120} className="mt-2 h-11" />
            </label>
            <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
              Observaciones
              <Textarea
                name="notes"
                maxLength={1000}
                className="mt-2 min-h-24"
              />
            </label>
          </div>
        </section>

        <section
          aria-labelledby="allocation-title"
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="allocation-title" className="text-lg font-semibold">
                Distribución
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Revisa cada monto antes de confirmar.
              </p>
            </div>
            <button
              type="button"
              onClick={autoAllocate}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold"
            >
              Aplicar a los más antiguos
            </button>
          </div>
          {validCharges.length ? (
            <div className="mt-5 grid gap-3">
              {validCharges.map((charge) => (
                <article
                  key={charge.charge_id}
                  className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_180px] md:items-end"
                >
                  <div>
                    <h3 className="font-semibold">{charge.concept}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Saldo:{" "}
                      {formatMoney(
                        charge.remaining_amount,
                        charge.currency_code ?? currency,
                      )}{" "}
                      · Cargo: {charge.charge_date}
                    </p>
                  </div>
                  <label className="text-sm font-semibold">
                    Monto aplicado
                    <Input
                      inputMode="decimal"
                      aria-label={`Monto aplicado a ${charge.concept}`}
                      value={allocations[charge.charge_id] ?? ""}
                      onChange={(event) =>
                        setAllocations((current) => ({
                          ...current,
                          [charge.charge_id]: event.target.value,
                        }))
                      }
                      className="mt-2 h-12 text-base font-semibold"
                    />
                  </label>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              No hay cargos abiertos. El pago completo quedará no aplicado.
            </p>
          )}
        </section>

        <section
          aria-live="polite"
          className="sticky bottom-3 rounded-2xl border border-slate-300 bg-[#0b2341] p-4 text-white shadow-xl [padding-bottom:max(1rem,env(safe-area-inset-bottom))]"
        >
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-slate-300">Pago</dt>
              <dd className="mt-1 font-semibold">
                {formatMoney(centsToMoney(totals.payment), currency)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-300">Aplicado</dt>
              <dd className="mt-1 font-semibold">
                {formatMoney(centsToMoney(totals.applied), currency)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-300">No aplicado</dt>
              <dd
                className={`mt-1 font-semibold ${totals.unapplied < 0n ? "text-red-300" : "text-amber-300"}`}
              >
                {formatMoney(centsToMoney(totals.unapplied), currency)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={!totals.valid || totals.payment <= 0n || pending}
            onClick={() => dialogRef.current?.showModal()}
            className="mt-4 min-h-11 w-full rounded-xl bg-amber-400 px-4 font-semibold text-[#0b2341] disabled:opacity-50"
          >
            Revisar y confirmar pago
          </button>
        </section>
      </form>

      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-payment-title"
        aria-describedby="confirm-payment-description"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-950/50"
      >
        <div className="overflow-y-auto p-5 sm:p-6">
          <h2 id="confirm-payment-title" className="text-xl font-semibold">
            ¿Confirmar este pago?
          </h2>
          <p
            id="confirm-payment-description"
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            Una vez confirmado, cualquier corrección deberá realizarse mediante
            anulación.
          </p>
          <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Cliente</dt>
              <dd className="font-semibold">{client.full_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Monto</dt>
              <dd className="font-semibold">
                {formatMoney(centsToMoney(totals.payment), currency)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Aplicado</dt>
              <dd className="font-semibold">
                {formatMoney(centsToMoney(totals.applied), currency)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">No aplicado</dt>
              <dd className="font-semibold">
                {formatMoney(centsToMoney(totals.unapplied), currency)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cargos</dt>
              <dd className="font-semibold">{allocationPayload.length}</dd>
            </div>
          </dl>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold"
            >
              Volver
            </button>
            <button
              type="submit"
              form="payment-confirmation-form"
              disabled={pending}
              className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Confirmando pago…" : "Confirmar pago"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
