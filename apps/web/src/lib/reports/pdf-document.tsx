import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatMoney } from "../financial/money";
import { reportCatalog, type ReportType } from "./config";
import type { ReportData } from "./types";
import type { ReportFilters } from "./validation";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: "#172033",
  },
  brand: {
    fontSize: 9,
    color: "#b45309",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: { marginTop: 4, fontSize: 18, color: "#0b2341", fontWeight: 700 },
  meta: { marginTop: 5, color: "#475569", lineHeight: 1.45 },
  summary: {
    marginTop: 12,
    padding: 9,
    backgroundColor: "#f8fafc",
    border: "1 solid #e2e8f0",
    borderRadius: 5,
  },
  summaryTitle: { fontSize: 9, fontWeight: 700, color: "#0b2341" },
  summaryText: { marginTop: 3, color: "#334155", lineHeight: 1.4 },
  table: { marginTop: 13, border: "1 solid #cbd5e1" },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", minHeight: 23 },
  headerRow: { backgroundColor: "#17365d", color: "#ffffff", fontWeight: 700 },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 6,
    paddingHorizontal: 4,
    lineHeight: 1.25,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 7,
  },
  empty: {
    marginTop: 14,
    padding: 16,
    textAlign: "center",
    backgroundColor: "#f8fafc",
    color: "#64748b",
  },
});

function pdfValue(
  type: ReportType,
  key: string,
  kind: string | undefined,
  row: Record<string, unknown>,
) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "-";
  if (kind === "money")
    return formatMoney(Number(value), String(row.currency_code ?? "HNL"));
  if (kind === "date")
    return new Intl.DateTimeFormat("es-HN", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${String(value)}T00:00:00Z`));
  if (kind === "status")
    return reportCatalog[type].statuses?.[String(value)] ?? String(value);
  return String(value).replace(/[\u0000-\u001F]/g, " ");
}

export function ReportPdfDocument({
  type,
  data,
  filters,
  generatedAt,
  generatedBy,
}: {
  type: ReportType;
  data: ReportData;
  filters: ReportFilters;
  generatedAt: Date;
  generatedBy: string;
}) {
  const definition = reportCatalog[type];
  const groups = Array.isArray(data.summary) ? data.summary : [data.summary];
  return (
    <Document
      title={`Reporte ${definition.title}`}
      author="Asesoría Educativa DIACA"
      subject="Reporte administrativo privado"
    >
      <Page size="LETTER" orientation="landscape" style={styles.page} wrap>
        <View fixed>
          <Text style={styles.brand}>Asesoría Educativa DIACA</Text>
          <Text style={styles.title}>{definition.title}</Text>
          <Text style={styles.meta}>
            Período: {filters.from ?? "inicio"} a {filters.to ?? "hoy"} ·
            Moneda: {filters.currency ?? "separada por fila"} · Generado:{" "}
            {generatedAt.toISOString()} · Por: {generatedBy}
          </Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumen</Text>
          {groups.map((group, index) => (
            <Text key={index} style={styles.summaryText}>
              {Object.entries(group)
                .map(([key, value]) => `${key}: ${String(value ?? 0)}`)
                .join(" · ")}
            </Text>
          ))}
        </View>
        {data.rows.length ? (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]} fixed>
              {definition.columns.map((column) => (
                <Text key={column.key} style={styles.cell}>
                  {column.label}
                </Text>
              ))}
            </View>
            {data.rows.map((row, index) => (
              <View
                key={String(row.id ?? row.client_id ?? index)}
                style={styles.row}
                wrap={false}
              >
                {definition.columns.map((column) => (
                  <Text key={column.key} style={styles.cell}>
                    {pdfValue(type, column.key, column.kind, row)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>
            Sin registros para los filtros seleccionados.
          </Text>
        )}
        <View style={styles.footer} fixed>
          <Text>
            Uso administrativo. No constituye certificación bancaria ni informe
            auditado.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
