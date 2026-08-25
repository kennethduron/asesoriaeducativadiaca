import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintReceiptButton } from "@/components/admin/print-receipt-button";
import { requirePermission } from "@/lib/auth/authorization";
import { formatMoney } from "@/lib/financial/money";
import { getReceipt } from "@/lib/financial/queries";
import { receiptSnapshotSchema } from "@/lib/financial/validation";

const dateTime = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("payments.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const receipt = await getReceipt(id);
  if (!receipt) notFound();
  const parsed = receiptSnapshotSchema.safeParse(receipt.snapshot);
  if (!parsed.success) throw new Error("INVALID_RECEIPT_SNAPSHOT");
  const snapshot = parsed.data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/pagos/${receipt.payment_id}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600"
        >
          ← Volver al pago
        </Link>
        <PrintReceiptButton />
      </div>

      <article className="receipt-sheet mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:mt-0">
        <header className="bg-[#0b2341] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-amber-300 uppercase">
                Recibo oficial
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {snapshot.business.name}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-mono text-xl font-semibold">
                {snapshot.receipt_number}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                {receipt.status === "issued" ? "Emitido" : "Anulado"}
              </span>
            </div>
          </div>
        </header>

        {receipt.status === "voided" ? (
          <section className="border-b border-red-200 bg-red-50 p-5 text-red-950">
            <h2 className="font-semibold">Recibo anulado</h2>
            <p className="mt-1 text-sm">
              Este número permanece reservado y no tiene vigencia como pago.
              {receipt.void_reason ? ` Motivo: ${receipt.void_reason}` : ""}
            </p>
          </section>
        ) : null}

        <div className="p-5 sm:p-8">
          <section className="grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Recibido de
              </h2>
              <p className="mt-2 text-lg font-semibold">
                {snapshot.client.name}
              </p>
              <p className="mt-1 font-mono text-sm text-slate-500">
                {snapshot.client.code}
              </p>
            </div>
            <dl className="grid gap-3 text-sm sm:text-right">
              <div>
                <dt className="text-slate-500">Fecha de pago</dt>
                <dd className="font-semibold">{snapshot.payment.date}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Emitido</dt>
                <dd className="font-semibold">
                  {dateTime.format(new Date(snapshot.issued_at))}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Método</dt>
                <dd className="font-semibold">{snapshot.payment.method}</dd>
              </div>
              {snapshot.payment.reference ? (
                <div>
                  <dt className="text-slate-500">Referencia</dt>
                  <dd className="break-all font-semibold">
                    {snapshot.payment.reference}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section aria-labelledby="receipt-concepts" className="mt-8">
            <h2 id="receipt-concepts" className="text-lg font-semibold">
              Conceptos aplicados
            </h2>
            {snapshot.allocations.length ? (
              <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
                {snapshot.allocations.map((allocation) => (
                  <div
                    key={allocation.charge_id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <p className="min-w-0 flex-1 font-medium">
                      {allocation.concept}
                    </p>
                    <p className="font-semibold">
                      {formatMoney(allocation.amount, allocation.currency_code)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                Pago recibido como crédito no aplicado.
              </p>
            )}
          </section>

          <section className="mt-8 ml-auto max-w-sm rounded-xl bg-slate-50 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Total aplicado</dt>
                <dd className="font-semibold">
                  {formatMoney(
                    snapshot.payment.allocated_amount,
                    snapshot.payment.currency_code,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">No aplicado</dt>
                <dd className="font-semibold">
                  {formatMoney(
                    snapshot.payment.unapplied_amount,
                    snapshot.payment.currency_code,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-300 pt-3 text-lg">
                <dt className="font-semibold">Total recibido</dt>
                <dd className="font-bold">
                  {formatMoney(
                    snapshot.payment.amount,
                    snapshot.payment.currency_code,
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">
            Documento generado por el sistema administrativo de DIACA. El número
            de recibo es único y no se reutiliza aun cuando sea anulado.
          </footer>
        </div>
      </article>
    </div>
  );
}
