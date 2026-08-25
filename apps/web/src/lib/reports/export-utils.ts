import { reportCatalog, type ReportColumn, type ReportType } from "./config";

export function sanitizeSpreadsheetText(value: string) {
  const normalized = value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
    "",
  );
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

export function sanitizeFilename(value: string, extension: "xlsx" | "pdf") {
  const base =
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "Reporte-DIACA";
  return `${base}.${extension}`;
}

export function reportFilename(
  type: ReportType,
  generatedAt: Date,
  extension: "xlsx" | "pdf",
) {
  return sanitizeFilename(
    `Reporte-${reportCatalog[type].title}-${generatedAt.toISOString().slice(0, 10)}`,
    extension,
  );
}

export function exportCellValue(
  column: ReportColumn,
  row: Record<string, unknown>,
) {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return "";
  if (column.kind === "money") return Number(value);
  if (column.kind === "date") return new Date(`${String(value)}T00:00:00.000Z`);
  if (column.kind === "status") return reportCatalogStatus(row, String(value));
  return sanitizeSpreadsheetText(String(value));
}

function reportCatalogStatus(row: Record<string, unknown>, value: string) {
  const type = row.__report_type;
  return typeof type === "string" && type in reportCatalog
    ? (reportCatalog[type as ReportType].statuses?.[value] ?? value)
    : value;
}

export function rowsForExport(
  type: ReportType,
  rows: Record<string, unknown>[],
): Array<Record<string, unknown> & { __report_type: ReportType }> {
  return rows.map((row) => ({ ...row, __report_type: type }));
}
