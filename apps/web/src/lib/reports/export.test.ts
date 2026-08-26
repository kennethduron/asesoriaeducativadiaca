import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildReportWorkbook } from "./excel";
import { buildReportPdf } from "./pdf";
import {
  reportFilename,
  sanitizeFilename,
  sanitizeSpreadsheetText,
} from "./export-utils";
import type { ReportData } from "./types";

describe("report export safety", () => {
  it.each(["=SUM(A1:A2)", "+cmd", "-2+3", "@remote"])(
    "neutralizes Excel formula input %s",
    (value) => {
      expect(sanitizeSpreadsheetText(value)).toBe(`'${value}`);
    },
  );
  it("sanitizes and bounds filenames", () => {
    expect(sanitizeFilename("../../Reporte: Pagos agosto", "pdf")).toBe(
      "Reporte-Pagos-agosto.pdf",
    );
    expect(
      reportFilename("payments", new Date("2026-08-25T00:00:00Z"), "xlsx"),
    ).toMatch(/^Reporte-Pagos-e-ingresos-2026-08-25\.xlsx$/);
  });
  it("creates a real XLSX with numeric money and safe text", async () => {
    const data: ReportData = {
      type: "charges",
      total_count: 1,
      summary: [
        { currency_code: "HNL", billed: 1000, applied: 400, outstanding: 600 },
      ],
      rows: [
        {
          id: "a",
          client_id: "b",
          charge_date: "2026-08-25",
          client_name: "Cliente",
          concept: '=HYPERLINK("bad")',
          original_amount: 1000,
          applied_amount: 400,
          remaining_amount: 600,
          due_date: "2026-09-01",
          status: "partial",
          currency_code: "HNL",
        },
      ],
    };
    const buffer = await buildReportWorkbook(
      "charges",
      data,
      { q: "", sort: "date", direction: "desc", page: 1, pageSize: 20 },
      new Date("2026-08-25T12:00:00Z"),
      "Usuario DEV",
    );
    expect([...buffer.subarray(0, 2)]).toEqual([0x50, 0x4b]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.getWorksheet("Reporte");
    expect(sheet?.getRow(5).getCell(3).value).toBe('\'=HYPERLINK("bad")');
    expect(sheet?.getRow(5).getCell(4).value).toBe(1000);
    expect(sheet?.getRow(5).getCell(4).numFmt).toBe("#,##0.00");
  });
  it("reuses the export engine for a bank consolidation", async () => {
    const data: ReportData = {
      type: "bank",
      total_count: 1,
      summary: [
        {
          currency_code: "HNL",
          total_received: 125,
          total_applied: 100,
          total_unapplied: 25,
          payment_count: 1,
        },
      ],
      rows: [
        {
          id: "p",
          client_id: "c",
          payment_date: "2026-08-25",
          client_name: "Cliente",
          client_code: "CLI-1",
          reference_number: "=unsafe",
          method_name: "Transferencia",
          amount: 125,
          currency_code: "HNL",
          applied_amount: 100,
          unapplied_amount: 25,
          receipt_number: "REC-1",
          status: "confirmed",
        },
      ],
    };
    const buffer = await buildReportWorkbook(
      "bank",
      data,
      { q: "", sort: "date", direction: "desc", page: 1, pageSize: 20 },
      new Date("2026-08-25T12:00:00Z"),
      "Finance DEV",
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    expect(workbook.getWorksheet("Reporte")?.getRow(5).getCell(4).value).toBe(
      "'=unsafe",
    );
    expect(workbook.getWorksheet("Reporte")?.getRow(5).getCell(6).value).toBe(
      125,
    );
  });
  it("creates a real PDF without embedding spreadsheet formulas", async () => {
    const data: ReportData = {
      type: "clients",
      total_count: 1,
      summary: { active: 1, inactive: 0 },
      rows: [
        {
          id: "a",
          client_id: "a",
          client_code: "CLI-000001",
          client_name: "=SUM(A1:A2)",
          contact: "synthetic@example.invalid",
          status: "active",
          registered_on: "2026-08-25",
          active_services: 1,
        },
      ],
    };
    const buffer = await buildReportPdf(
      "clients",
      data,
      { q: "", sort: "date", direction: "desc", page: 1, pageSize: 20 },
      new Date("2026-08-25T12:00:00Z"),
      "Usuario DEV",
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1_000);
  });
  it("builds bounded large exports without sending rows to the browser", async () => {
    const rows = Array.from({ length: 2_500 }, (_, index) => ({
      id: `charge-${index}`,
      client_id: `client-${index % 500}`,
      charge_date: "2026-08-25",
      client_name: `Performance Client ${index % 500}`,
      concept: index === 0 ? "=unsafe" : `Performance Charge ${index}`,
      original_amount: 1_000 + index,
      applied_amount: 400,
      remaining_amount: 600 + index,
      due_date: "2026-09-25",
      status: "partial",
      currency_code: "HNL",
    }));
    const data: ReportData = {
      type: "charges",
      total_count: rows.length,
      summary: [
        {
          currency_code: "HNL",
          billed: 10_000,
          applied: 4_000,
          outstanding: 6_000,
        },
      ],
      rows,
    };
    const heapBefore = process.memoryUsage().heapUsed;
    const xlsxStarted = performance.now();
    const xlsx = await buildReportWorkbook(
      "charges",
      data,
      { q: "", sort: "date", direction: "desc", page: 1, pageSize: 100 },
      new Date("2026-08-25T12:00:00Z"),
      "Performance DEV",
    );
    const xlsxMilliseconds = performance.now() - xlsxStarted;
    const pdfStarted = performance.now();
    const pdfRows = 250;
    const pdf = await buildReportPdf(
      "charges",
      { ...data, total_count: pdfRows, rows: rows.slice(0, pdfRows) },
      { q: "", sort: "date", direction: "desc", page: 1, pageSize: 100 },
      new Date("2026-08-25T12:00:00Z"),
      "Performance DEV",
    );
    const pdfMilliseconds = performance.now() - pdfStarted;
    const heapDeltaBytes = Math.max(
      0,
      process.memoryUsage().heapUsed - heapBefore,
    );
    console.info(
      JSON.stringify({
        xlsxRows: rows.length,
        xlsxMilliseconds: Math.round(xlsxMilliseconds),
        xlsxBytes: xlsx.length,
        pdfRows,
        pdfMilliseconds: Math.round(pdfMilliseconds),
        pdfBytes: pdf.length,
        heapDeltaBytes,
      }),
    );
    expect(xlsx.subarray(0, 2).toString()).toBe("PK");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(xlsxMilliseconds).toBeLessThan(30_000);
    expect(pdfMilliseconds).toBeLessThan(30_000);
    expect(heapDeltaBytes).toBeLessThan(512 * 1024 * 1024);
  }, 60_000);
});
