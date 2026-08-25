import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  ReportFiltersForm,
  ReportResults,
} from "@/components/admin/report-view";
import { requireUser } from "@/lib/auth/authorization";
import { isReportType, reportCatalog } from "@/lib/reports/config";
import { canExportReport, canReadReport } from "@/lib/reports/permissions";
import { getReportData, getReportFilterOptions } from "@/lib/reports/queries";
import { parseReportFilters } from "@/lib/reports/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { type: rawType } = await params;
  if (!isReportType(rawType)) notFound();
  const type = rawType;
  const principal = await requireUser();
  if (!canReadReport(principal, type)) redirect("/access-denied");
  const { filters, error: filterError } = parseReportFilters(
    type,
    await searchParams,
  );
  const [dataResult, optionsResult] = await Promise.allSettled([
    getReportData(type, filters),
    getReportFilterOptions(),
  ]);
  const data = dataResult.status === "fulfilled" ? dataResult.value : null;
  const options =
    optionsResult.status === "fulfilled"
      ? optionsResult.value
      : { clients: [], categories: [], services: [], methods: [] };
  const definition = reportCatalog[type];
  return (
    <div>
      <Link
        href="/admin/reportes"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#17365d]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Centro de reportes
      </Link>
      <p className="mt-5 text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
        Reporte
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {definition.title}
      </h1>
      <p className="mt-2 max-w-3xl text-slate-600">{definition.description}</p>
      <ReportFiltersForm type={type} filters={filters} options={options} />
      {filterError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950"
        >
          {filterError}
        </p>
      ) : null}
      {data ? (
        <ReportResults
          type={type}
          data={data}
          filters={filters}
          canExport={canExportReport(principal, type)}
        />
      ) : (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 font-medium text-rose-900"
        >
          No pudimos cargar este reporte.
        </p>
      )}
    </div>
  );
}
