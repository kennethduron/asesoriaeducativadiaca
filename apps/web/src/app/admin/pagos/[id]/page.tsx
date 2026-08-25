import Link from "next/link";
import { notFound } from "next/navigation";

import { FinancialOperationDialog } from "@/components/admin/financial-operation-dialog";
import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { voidPaymentAction } from "@/lib/financial/actions";
import { formatMoney } from "@/lib/financial/money";
import { getPayment } from "@/lib/financial/queries";

const activityLabel: Record<string, string> = {
  "payment.draft_created": "Borrador creado",
  "payment.confirmed": "Pago confirmado",
  "payment.allocation.created": "Asignación registrada",
  "receipt.issued": "Recibo emitido",
  "payment.voided": "Pago anulado",
  "payment.allocation.reversed": "Asignación revertida",
  "receipt.voided": "Recibo anulado",
};
const statusLabel: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  voided: "Anulado",
};

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("payments.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const payment = await getPayment(id);
  if (!payment) notFound();
  const query = await searchParams;
  const receipt = Array.isArray(payment.receipts)
    ? payment.receipts[0]
    : payment.receipts;
  const activeAllocated = payment.payment_allocations
    .filter((item) => !item.reversed_at)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <div className="mx-auto max-w-5xl">
      {query.success === "voided" ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900"
        >
          Pago anulado correctamente.
        </p>
      ) : null}
      <Link
        href="/admin/pagos"
        className="text-sm font-semibold text-slate-600"
      >
        ← Volver a pagos
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-[#0b2341] p-6 text-white">
        <div>
          <p className="font-mono text-sm text-amber-300">
            {receipt?.receipt_number ?? "Pago sin recibo"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {payment.clients?.full_name}
          </h1>
          <p className="mt-2 text-slate-300">
            {formatMoney(payment.amount, payment.currency_code)} ·{" "}
            {payment.payment_methods?.name}
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          {statusLabel[payment.status]}
        </span>
      </header>
      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Monto</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney(payment.amount, payment.currency_code)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Aplicado</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney(activeAllocated, payment.currency_code)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">No aplicado</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">
            {formatMoney(
              payment.status === "confirmed"
                ? Number(payment.amount) - activeAllocated
                : 0,
              payment.currency_code,
            )}
          </p>
        </div>
      </section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Asignaciones</h2>
        {payment.payment_allocations.length ? (
          <div className="mt-4 grid gap-3">
            {payment.payment_allocations.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold">{item.charges?.concept}</p>
                  {item.reversed_at ? (
                    <p className="text-xs font-semibold text-red-700">
                      Revertida
                    </p>
                  ) : null}
                </div>
                <p className="font-semibold">
                  {formatMoney(
                    item.amount,
                    item.charges?.currency_code ?? payment.currency_code,
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Pago completamente no aplicado.
          </p>
        )}
        {receipt ? (
          <Link
            href={`/admin/recibos/${receipt.id}`}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
          >
            Ver recibo
          </Link>
        ) : null}
      </section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Actividad</h2>
        <ol className="mt-4 space-y-3">
          {payment.activity.map((event) => (
            <li key={event.id} className="border-l-2 border-amber-400 pl-4">
              <p className="font-semibold">
                {activityLabel[event.action] ?? "Actividad financiera"}
              </p>
              <p className="text-xs text-slate-500">
                {event.actor_name} ·{" "}
                {new Intl.DateTimeFormat("es-HN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(event.created_at))}
              </p>
            </li>
          ))}
        </ol>
      </section>
      {hasPermission(principal, "payments.void") &&
      payment.status === "confirmed" ? (
        <div className="mt-5">
          <FinancialOperationDialog
            action={voidPaymentAction}
            hiddenName="payment_id"
            hiddenValue={id}
            triggerLabel="Anular pago"
            title="¿Anular este pago?"
            description="Las asignaciones serán revertidas, el recibo quedará anulado y su número no se reutilizará."
            confirmLabel="Confirmar anulación"
          />
        </div>
      ) : null}
    </div>
  );
}
