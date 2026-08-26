import Link from "next/link";
import { ArrowRight, FileBarChart } from "lucide-react";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { reportCatalog, reportTypes } from "@/lib/reports/config";
import { canReadReport } from "@/lib/reports/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportsPage() {
  const principal = await requirePermission("reports.read");
  const available = reportTypes.filter((type) =>
    canReadReport(principal, type),
  );
  if (!available.length) redirect("/access-denied");
  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
        Inteligencia administrativa
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Centro de reportes
      </h1>
      <p className="mt-2 max-w-3xl leading-7 text-slate-600">
        Consulta, filtra y exporta información derivada. Las monedas permanecen
        separadas. El consolidado bancario es administrativo y no afirma
        conformidad con un formato bancario externo.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {available.map((type) => {
          const report = reportCatalog[type];
          return (
            <article
              key={type}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#17365d]">
                <FileBarChart className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{report.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                {report.description}
              </p>
              <Link
                href={`/admin/reportes/${type}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-[#17365d]"
              >
                Abrir reporte{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
