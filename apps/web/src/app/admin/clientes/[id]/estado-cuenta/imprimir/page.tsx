import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClientStatementView } from "@/components/admin/client-statement";
import { PrintStatementButton } from "@/components/admin/print-statement-button";
import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import {
  getClientStatement,
  listClientStatementCurrencies,
} from "@/lib/statements/queries";
import { resolveStatementFilters } from "@/lib/statements/validation";

export default async function PrintableStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("charges.read");
  if (!hasPermission(principal, "payments.read")) redirect("/access-denied");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const raw = await searchParams;
  const currencies = await listClientStatementCurrencies(id);
  const parsed = resolveStatementFilters(raw, currencies[0] ?? "HNL");
  if (!parsed.success) notFound();
  const statement = await getClientStatement(id, parsed.data);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="print-hidden mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/clientes/${id}?tab=estado-cuenta&currency=${statement.currency}&from=${statement.period.from}&to=${statement.period.to}`}
          className="inline-flex min-h-11 items-center font-semibold text-slate-600"
        >
          ← Volver al estado de cuenta
        </Link>
        <PrintStatementButton />
      </div>
      <ClientStatementView
        statement={statement}
        currencies={currencies}
        profilePath={`/admin/clientes/${id}?tab=estado-cuenta`}
        printable
      />
    </div>
  );
}
