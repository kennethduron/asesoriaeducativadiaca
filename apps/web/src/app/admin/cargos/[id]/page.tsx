import Link from "next/link";
import { notFound } from "next/navigation";

import { FinancialOperationDialog } from "@/components/admin/financial-operation-dialog";
import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { cancelChargeAction } from "@/lib/financial/actions";
import { formatMoney } from "@/lib/financial/money";
import { getCharge } from "@/lib/financial/queries";

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagado",
  cancelled: "Cancelado",
};

export default async function ChargeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("charges.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const charge = await getCharge(id);
  if (!charge) notFound();
  const query = await searchParams;
  const success =
    query.success === "created"
      ? "Cargo registrado correctamente."
      : query.success === "cancelled"
        ? "Cargo cancelado correctamente."
        : null;
  return (
    <div className="mx-auto max-w-4xl">
      {success ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900"
        >
          {success}
        </p>
      ) : null}
      <Link
        href="/admin/cargos"
        className="text-sm font-semibold text-slate-600"
      >
        ← Volver a cargos
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-[#0b2341] p-6 text-white">
        <div>
          <p className="font-mono text-sm text-amber-300">
            {charge.clients?.client_code}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{charge.concept}</h1>
          <p className="mt-2 text-slate-300">{charge.clients?.full_name}</p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          {statusLabel[charge.balance.derived_status ?? ""]}
        </span>
      </header>
      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Monto</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney(charge.amount, charge.currency_code)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Aplicado</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney(
              charge.balance.allocated_amount ?? 0,
              charge.currency_code,
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">Saldo</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">
            {formatMoney(
              charge.balance.remaining_amount ?? 0,
              charge.currency_code,
            )}
          </p>
        </div>
      </section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Fecha</dt>
            <dd className="mt-1 font-medium">{charge.charge_date}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Vencimiento</dt>
            <dd className="mt-1 font-medium">
              {charge.due_date ?? "Sin fecha"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Servicio</dt>
            <dd className="mt-1 font-medium">
              {charge.client_services?.service_catalog?.name ??
                "Sin servicio relacionado"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Referencia</dt>
            <dd className="mt-1 font-medium">
              {charge.reference ?? "Sin referencia"}
            </dd>
          </div>
        </dl>
        {charge.notes ? (
          <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">
            {charge.notes}
          </p>
        ) : null}
      </section>
      {hasPermission(principal, "charges.cancel") &&
      charge.status !== "cancelled" ? (
        <div className="mt-5">
          <FinancialOperationDialog
            action={cancelChargeAction}
            hiddenName="charge_id"
            hiddenValue={id}
            triggerLabel="Cancelar cargo"
            title="¿Cancelar este cargo?"
            description="Solo es posible si no tiene pagos activos aplicados. No se eliminará ningún registro."
            confirmLabel="Confirmar cancelación"
          />
        </div>
      ) : null}
    </div>
  );
}
