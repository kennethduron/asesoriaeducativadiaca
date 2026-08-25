import "server-only";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatMoney } from "@/lib/financial/money";
import {
  agingLabels,
  type ClientStatement,
  movementLabels,
} from "@/lib/statements/types";

const navy = "#0b2341";
const gold = "#d9ad4f";
const slate = "#526175";
const line = "#dfe5ee";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 48,
    paddingLeft: 34,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#17202d",
  },
  header: {
    backgroundColor: navy,
    color: "#ffffff",
    padding: 18,
    borderRadius: 6,
  },
  eyebrow: {
    color: "#f0c766",
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: { fontSize: 20, fontWeight: 700, marginTop: 5 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerMeta: { textAlign: "right", lineHeight: 1.5, color: "#d9e1eb" },
  clientRow: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clientName: { fontSize: 12, fontWeight: 700 },
  muted: { color: slate, marginTop: 3, lineHeight: 1.4 },
  section: { marginTop: 15 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: navy },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  summaryCard: {
    width: "33.333%",
    paddingRight: 5,
    paddingBottom: 6,
  },
  summaryCardInner: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 4,
    padding: 8,
  },
  summaryLabel: { color: slate, fontSize: 7.5 },
  summaryValue: { marginTop: 4, fontSize: 10, fontWeight: 700 },
  agingRow: { flexDirection: "row", marginTop: 7 },
  agingCard: {
    flexGrow: 1,
    borderTopWidth: 3,
    borderTopColor: gold,
    backgroundColor: "#f7f9fb",
    padding: 7,
    marginRight: 4,
  },
  agingLabel: { color: slate, fontSize: 7 },
  agingValue: { marginTop: 4, fontSize: 9, fontWeight: 700 },
  table: { marginTop: 7, borderWidth: 1, borderColor: line },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eef2f6",
    color: navy,
    fontWeight: 700,
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: line,
    paddingVertical: 6,
  },
  dateCell: { width: "11%", paddingHorizontal: 4 },
  typeCell: { width: "12%", paddingHorizontal: 4 },
  descriptionCell: { width: "35%", paddingHorizontal: 4 },
  moneyCell: { width: "14%", paddingHorizontal: 4, textAlign: "right" },
  empty: {
    marginTop: 7,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: line,
    padding: 12,
    color: slate,
    textAlign: "center",
  },
  disclaimer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: line,
    color: slate,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    color: slate,
    fontSize: 7,
  },
});

function amount(value: number, currency: string) {
  return formatMoney(value, currency);
}

export function StatementPdfDocument({
  statement,
}: {
  statement: ClientStatement;
}) {
  const summary = [
    ["Saldo inicial", statement.summary.opening_balance],
    ["Cargos del periodo", statement.summary.period_charges],
    ["Pagos aplicados", statement.summary.period_applied_payments],
    ["Saldo final", statement.summary.closing_balance],
    ["Saldo vencido", statement.summary.overdue_balance],
    ["Credito no aplicado", statement.summary.unapplied_credit],
  ] as const;
  const aging = [
    ["current", statement.aging.current],
    ["1_30", statement.aging["1_30"]],
    ["31_60", statement.aging["31_60"]],
    ["61_90", statement.aging["61_90"]],
    ["90_plus", statement.aging["90_plus"]],
  ] as const;

  return (
    <Document
      title={`Estado de cuenta ${statement.client.client_code}`}
      author="Asesoria Educativa DIACA"
      subject="Estado de cuenta administrativo"
      language="es-HN"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>Asesoria Educativa DIACA</Text>
              <Text style={styles.title}>Estado de cuenta</Text>
            </View>
            <Text style={styles.headerMeta}>
              Periodo: {statement.period.from} al {statement.period.to}
              {"\n"}Moneda: {statement.currency}
            </Text>
          </View>
        </View>

        <View style={styles.clientRow}>
          <View>
            <Text style={styles.clientName}>{statement.client.full_name}</Text>
            <Text style={styles.muted}>{statement.client.client_code}</Text>
            {statement.client.email ? (
              <Text style={styles.muted}>{statement.client.email}</Text>
            ) : null}
          </View>
          <View>
            <Text style={{ textAlign: "right", fontWeight: 700 }}>
              {statement.summary.is_delinquent ? "Con saldo vencido" : "Al dia"}
            </Text>
            <Text style={[styles.muted, { textAlign: "right" }]}>
              Generado: {statement.generated_at.slice(0, 10)}
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Documento generado por el sistema con fines administrativos. No
          constituye certificacion bancaria ni informe auditado. El credito no
          aplicado se presenta por separado y no reduce automaticamente el saldo
          de los cargos.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.summaryGrid}>
            {summary.map(([label, value]) => (
              <View key={label} style={styles.summaryCard}>
                <View style={styles.summaryCardInner}>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryValue}>
                    {amount(value, statement.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          {(statement.summary.period_payment_reversals > 0 ||
            statement.summary.period_charge_cancellations > 0) && (
            <Text style={styles.muted}>
              Reversiones:{" "}
              {amount(
                statement.summary.period_payment_reversals,
                statement.currency,
              )}{" "}
              - Cancelaciones:{" "}
              {amount(
                statement.summary.period_charge_cancellations,
                statement.currency,
              )}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Aging al {statement.aging.as_of}
          </Text>
          <View style={styles.agingRow}>
            {aging.map(([bucket, value]) => (
              <View key={bucket} style={styles.agingCard}>
                <Text style={styles.agingLabel}>{agingLabels[bucket]}</Text>
                <Text style={styles.agingValue}>
                  {amount(value, statement.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movimientos</Text>
          {statement.movements.length ? (
            <View style={styles.table}>
              <View style={styles.tableHeader} fixed>
                <Text style={styles.dateCell}>Fecha</Text>
                <Text style={styles.typeCell}>Tipo</Text>
                <Text style={styles.descriptionCell}>Descripcion</Text>
                <Text style={styles.moneyCell}>Cargo</Text>
                <Text style={styles.moneyCell}>Pago</Text>
                <Text style={styles.moneyCell}>Saldo</Text>
              </View>
              {statement.movements.map((movement) => (
                <View
                  key={movement.event_key}
                  style={styles.tableRow}
                  wrap={false}
                >
                  <Text style={styles.dateCell}>{movement.date}</Text>
                  <Text style={styles.typeCell}>
                    {movementLabels[movement.type] ?? movement.type}
                  </Text>
                  <Text style={styles.descriptionCell}>
                    {movement.description}
                    {movement.unapplied_amount
                      ? ` - No aplicado: ${amount(movement.unapplied_amount, statement.currency)}`
                      : ""}
                  </Text>
                  <Text style={styles.moneyCell}>
                    {movement.debit
                      ? amount(movement.debit, statement.currency)
                      : "-"}
                  </Text>
                  <Text style={styles.moneyCell}>
                    {movement.credit
                      ? amount(movement.credit, statement.currency)
                      : "-"}
                  </Text>
                  <Text style={styles.moneyCell}>
                    {amount(movement.running_balance, statement.currency)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>
              No hay movimientos en el periodo seleccionado.
            </Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Asesoria Educativa DIACA - Honduras</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
