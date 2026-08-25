import Link from "next/link";
import { Download, ExternalLink, Printer } from "lucide-react";

import { formatMoney } from "@/lib/financial/money";
import {
  agingLabels,
  type ClientStatement,
  movementLabels,
} from "@/lib/statements/types";

const chargeStatus: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  overdue: "Vencido",
};

function withFilters(path: string, statement: ClientStatement) {
  const params = new URLSearchParams({
    from: statement.period.from,
    to: statement.period.to,
    currency: statement.currency,
  });
  return `${path}?${params}`;
}

function Money({ value, currency }: { value: number; currency: string }) {
  return <>{formatMoney(value, currency)}</>;
}

export function ClientStatementView({
  statement,
  currencies,
  profilePath,
  printable = false,
}: {
  statement: ClientStatement;
  currencies: string[];
  profilePath: string;
  printable?: boolean;
}) {
  const aging = [
    ["current", statement.aging.current],
    ["1_30", statement.aging["1_30"]],
    ["31_60", statement.aging["31_60"]],
    ["61_90", statement.aging["61_90"]],
    ["90_plus", statement.aging["90_plus"]],
  ] as const;
  const pdfUrl = withFilters(
    `/admin/clientes/${statement.client.id}/estado-cuenta/pdf`,
    statement,
  );
  const printUrl = withFilters(
    `/admin/clientes/${statement.client.id}/estado-cuenta/imprimir`,
    statement,
  );

  return (
    <article className="statement-sheet space-y-6">
      <section className="print-only hidden border-b-2 border-[#0b2341] pb-5 print:block">
        <p className="text-sm font-semibold tracking-[0.16em] text-amber-700 uppercase">
          Asesoría Educativa DIACA
        </p>
        <div className="mt-2 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">Estado de cuenta</h1>
            <p className="mt-1 text-sm text-slate-600">
              {statement.client.full_name} · {statement.client.client_code}
            </p>
          </div>
          <p className="text-right text-sm text-slate-600">
            {statement.period.from} al {statement.period.to}
            <br />
            Moneda: {statement.currency}
          </p>
        </div>
      </section>

      {!printable ? (
        <div className="print-hidden space-y-4">
          <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_150px_auto]">
            <input type="hidden" name="tab" value="estado-cuenta" />
            <label className="text-sm font-medium text-slate-700">
              Desde
              <input
                name="from"
                type="date"
                defaultValue={statement.period.from}
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Hasta
              <input
                name="to"
                type="date"
                defaultValue={statement.period.to}
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Moneda
              <select
                name="currency"
                defaultValue={statement.currency}
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
              >
                {(currencies.length ? currencies : [statement.currency]).map(
                  (currency) => (
                    <option key={currency}>{currency}</option>
                  ),
                )}
              </select>
            </label>
            <button className="min-h-11 self-end rounded-xl bg-[#0b2341] px-5 font-semibold text-white">
              Aplicar filtros
            </button>
          </form>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={pdfUrl}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 font-semibold text-[#0b2341]"
            >
              <Download className="size-4" aria-hidden="true" /> Descargar PDF
            </a>
            <Link
              href={printUrl}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold"
            >
              <Printer className="size-4" aria-hidden="true" /> Vista imprimible
            </Link>
          </div>
        </div>
      ) : null}

      <section aria-labelledby="statement-summary">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="statement-summary" className="text-xl font-semibold">
              Resumen financiero · {statement.currency}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Los saldos se derivan de cargos y asignaciones activas.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statement.summary.is_delinquent ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"}`}
          >
            {statement.summary.is_delinquent ? "Con saldo vencido" : "Al día"}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total facturado", statement.summary.total_charged],
            ["Total pagado/aplicado", statement.summary.total_applied],
            ["Saldo pendiente", statement.summary.outstanding_balance],
            ["Saldo vencido", statement.summary.overdue_balance],
            ["Crédito no aplicado", statement.summary.unapplied_credit],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <dt className="text-sm text-slate-600">{label}</dt>
              <dd className="mt-2 text-xl font-semibold">
                <Money value={value as number} currency={statement.currency} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="statement-reconciliation"
        className="rounded-2xl bg-[#0b2341] p-5 text-white"
      >
        <h2 id="statement-reconciliation" className="text-lg font-semibold">
          Reconciliación del período
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Saldo inicial", statement.summary.opening_balance],
            ["Cargos", statement.summary.period_charges],
            ["Pagos aplicados", statement.summary.period_applied_payments],
            ["Reversiones", statement.summary.period_payment_reversals],
            ["Cancelaciones", statement.summary.period_charge_cancellations],
            ["Saldo final", statement.summary.closing_balance],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-slate-300">{label}</dt>
              <dd className="mt-1 font-semibold">
                <Money value={value as number} currency={statement.currency} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="statement-aging">
        <h2 id="statement-aging" className="text-xl font-semibold">
          Aging de cuentas por cobrar
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Corte al {statement.aging.as_of}. Los cargos sin vencimiento están al
          corriente.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {aging.map(([bucket, value]) => (
            <div
              key={bucket}
              className="rounded-2xl border border-slate-200 bg-white p-4 last:col-span-2 sm:last:col-span-1"
            >
              <dt className="text-sm font-semibold text-slate-600">
                {agingLabels[bucket]}
              </dt>
              <dd className="mt-2 text-lg font-semibold">
                <Money value={value} currency={statement.currency} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="open-charges">
        <h2 id="open-charges" className="text-xl font-semibold">
          Cargos abiertos
        </h2>
        {statement.open_charges.length ? (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <caption className="sr-only">
                  Cargos abiertos del cliente
                </caption>
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    {[
                      "Concepto",
                      "Fecha",
                      "Vencimiento",
                      "Original",
                      "Aplicado",
                      "Saldo",
                      "Días",
                      "Estado",
                    ].map((title) => (
                      <th key={title} scope="col" className="px-4 py-3">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.open_charges.map((charge) => (
                    <tr key={charge.charge_id}>
                      <td className="px-4 py-4 font-medium">
                        {charge.concept}
                      </td>
                      <td className="px-4 py-4">{charge.charge_date}</td>
                      <td className="px-4 py-4">
                        {charge.due_date ?? "Sin fecha"}
                      </td>
                      <td className="px-4 py-4">
                        <Money
                          value={charge.original_amount}
                          currency={statement.currency}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Money
                          value={charge.applied_amount}
                          currency={statement.currency}
                        />
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        <Money
                          value={charge.remaining_amount}
                          currency={statement.currency}
                        />
                      </td>
                      <td className="px-4 py-4">{charge.days_overdue}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                          {chargeStatus[charge.status] ?? charge.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 lg:hidden">
              {statement.open_charges.map((charge) => (
                <details
                  key={charge.charge_id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <summary className="min-h-11 cursor-pointer list-none">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{charge.concept}</span>
                      <span className="whitespace-nowrap font-semibold">
                        <Money
                          value={charge.remaining_amount}
                          currency={statement.currency}
                        />
                      </span>
                    </span>
                    <span className="mt-2 block text-sm text-slate-600">
                      Vence: {charge.due_date ?? "Sin fecha"} ·{" "}
                      {chargeStatus[charge.status] ?? charge.status}
                    </span>
                  </summary>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                    <div>
                      <dt className="text-slate-500">Monto original</dt>
                      <dd className="font-semibold">
                        <Money
                          value={charge.original_amount}
                          currency={statement.currency}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Aplicado</dt>
                      <dd className="font-semibold">
                        <Money
                          value={charge.applied_amount}
                          currency={statement.currency}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Días vencidos</dt>
                      <dd>{charge.days_overdue}</dd>
                    </div>
                  </dl>
                </details>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            Este cliente todavía no tiene cargos abiertos en{" "}
            {statement.currency}.
          </p>
        )}
      </section>

      <section aria-labelledby="statement-movements">
        <h2 id="statement-movements" className="text-xl font-semibold">
          Movimientos del período
        </h2>
        {statement.movements.length ? (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <caption className="sr-only">Movimientos financieros</caption>
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    {[
                      "Fecha",
                      "Tipo",
                      "Documento",
                      "Descripción",
                      "Cargo",
                      "Pago",
                      "Saldo",
                    ].map((title) => (
                      <th key={title} scope="col" className="px-4 py-3">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.movements.map((movement) => (
                    <tr key={movement.event_key}>
                      <td className="px-4 py-4">{movement.date}</td>
                      <td className="px-4 py-4 font-medium">
                        {movementLabels[movement.type] ?? movement.type}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        {movement.receipt_id ? (
                          <Link
                            href={`/admin/recibos/${movement.receipt_id}`}
                            className="inline-flex min-h-11 items-center gap-1 font-semibold text-[#17365d]"
                          >
                            {movement.reference}
                            <ExternalLink
                              className="size-3"
                              aria-hidden="true"
                            />
                          </Link>
                        ) : (
                          movement.reference
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        {movement.description}
                        {movement.unapplied_amount ? (
                          <span className="mt-1 block text-xs text-amber-800">
                            No aplicado:{" "}
                            {formatMoney(
                              movement.unapplied_amount,
                              statement.currency,
                            )}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {movement.debit ? (
                          <Money
                            value={movement.debit}
                            currency={statement.currency}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {movement.credit ? (
                          <Money
                            value={movement.credit}
                            currency={statement.currency}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        <Money
                          value={movement.running_balance}
                          currency={statement.currency}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol className="mt-4 space-y-3 lg:hidden">
              {statement.movements.map((movement) => (
                <li
                  key={movement.event_key}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">{movement.date}</p>
                      <h3 className="mt-1 font-semibold">
                        {movementLabels[movement.type] ?? movement.type}
                      </h3>
                    </div>
                    <p className="font-semibold">
                      {movement.debit ? "+" : "-"}
                      <Money
                        value={movement.debit || movement.credit}
                        currency={statement.currency}
                      />
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    {movement.description}
                  </p>
                  <div className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                    {movement.receipt_id ? (
                      <Link
                        href={`/admin/recibos/${movement.receipt_id}`}
                        className="inline-flex min-h-11 items-center font-mono font-semibold text-[#17365d]"
                      >
                        {movement.reference}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        {movement.reference}
                      </span>
                    )}
                    <span>
                      Saldo:{" "}
                      {formatMoney(
                        movement.running_balance,
                        statement.currency,
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            No hay movimientos en el período. El saldo inicial y final se
            mantienen visibles arriba.
          </p>
        )}
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
        Documento generado por el sistema con fines administrativos. No
        constituye certificación bancaria ni informe auditado.
        {!printable ? (
          <Link
            href={profilePath}
            className="print-hidden ml-2 inline-flex min-h-11 items-center font-semibold text-[#17365d]"
          >
            Volver al perfil
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
