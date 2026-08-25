import ExcelJS from "exceljs";

import { reportCatalog, type ReportType } from "./config";
import {
  exportCellValue,
  rowsForExport,
  sanitizeSpreadsheetText,
} from "./export-utils";
import type { ReportData } from "./types";
import type { ReportFilters } from "./validation";

export async function buildReportWorkbook(
  type: ReportType,
  data: ReportData,
  filters: ReportFilters,
  generatedAt: Date,
  generatedBy: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Asesoría Educativa DIACA";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.properties.date1904 = false;
  const definition = reportCatalog[type];
  const sheet = workbook.addWorksheet("Reporte", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  sheet.addRow(["Asesoría Educativa DIACA"]);
  sheet.addRow([definition.title]);
  sheet.addRow([
    `Generado: ${generatedAt.toISOString()} · Por: ${sanitizeSpreadsheetText(generatedBy)}`,
  ]);
  const headerRow = sheet.addRow(
    definition.columns.map((column) => column.label),
  );
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17365D" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  headerRow.height = 26;

  const safeRows = rowsForExport(type, data.rows);
  if (!safeRows.length) sheet.addRow(["Sin registros"]);
  for (const row of safeRows) {
    const excelRow = sheet.addRow(
      definition.columns.map((column) => exportCellValue(column, row)),
    );
    definition.columns.forEach((column, index) => {
      const cell = excelRow.getCell(index + 1);
      if (column.kind === "date" && cell.value) cell.numFmt = "dd/mm/yyyy";
      if (column.kind === "money") cell.numFmt = "#,##0.00";
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: definition.columns.length },
  };
  definition.columns.forEach((column, index) => {
    const values = [
      column.label,
      ...safeRows.slice(0, 250).map((row) => String(row[column.key] ?? "")),
    ];
    sheet.getColumn(index + 1).width = Math.min(
      42,
      Math.max(12, ...values.map((value) => value.length + 2)),
    );
  });
  sheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF0B2341" },
  };
  sheet.getCell("A2").font = { bold: true, size: 13 };
  sheet.mergeCells(1, 1, 1, Math.max(1, definition.columns.length));
  sheet.mergeCells(2, 1, 2, Math.max(1, definition.columns.length));
  sheet.mergeCells(3, 1, 3, Math.max(1, definition.columns.length));

  const summary = workbook.addWorksheet("Resumen");
  summary.addRow(["Resumen", definition.title]);
  summary.addRow([
    "Filtros",
    JSON.stringify({
      from: filters.from ?? null,
      to: filters.to ?? null,
      currency: filters.currency ?? null,
      status: filters.status ?? null,
    }),
  ]);
  const groups = Array.isArray(data.summary) ? data.summary : [data.summary];
  for (const group of groups) {
    summary.addRow([]);
    summary.addRow([
      "Moneda",
      group.currency_code
        ? sanitizeSpreadsheetText(String(group.currency_code))
        : "No aplica",
    ]);
    for (const [key, value] of Object.entries(group)) {
      if (key === "currency_code") continue;
      const safeValue =
        typeof value === "number"
          ? value
          : sanitizeSpreadsheetText(String(value ?? ""));
      summary.addRow([sanitizeSpreadsheetText(key), safeValue]);
    }
  }
  summary.getColumn(1).width = 26;
  summary.getColumn(2).width = 48;
  summary.getRow(1).font = { bold: true, size: 14 };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
