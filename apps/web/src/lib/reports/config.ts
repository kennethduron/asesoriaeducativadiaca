export const reportTypes = [
  "clients",
  "services",
  "charges",
  "payments",
  "receivables",
  "aging",
  "bank",
] as const;
export type ReportType = (typeof reportTypes)[number];

export type ReportColumn = {
  key: string;
  label: string;
  kind?:
    | "text"
    | "date"
    | "money"
    | "status"
    | "client"
    | "charge"
    | "payment"
    | "receipt";
};

type ReportDefinition = {
  title: string;
  description: string;
  defaultSort: string;
  sorts: Record<string, string>;
  statuses?: Record<string, string>;
  columns: ReportColumn[];
};

export const reportCatalog: Record<ReportType, ReportDefinition> = {
  clients: {
    title: "Clientes",
    description:
      "Altas, estado y servicios activos sin exponer PII innecesaria.",
    defaultSort: "date",
    sorts: {
      date: "Fecha de alta",
      client: "Cliente",
      status: "Estado",
      services: "Servicios activos",
    },
    statuses: { active: "Activo", inactive: "Inactivo" },
    columns: [
      { key: "client_code", label: "Código" },
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "contact", label: "Contacto" },
      { key: "status", label: "Estado", kind: "status" },
      { key: "registered_on", label: "Fecha de alta", kind: "date" },
      { key: "active_services", label: "Servicios activos" },
    ],
  },
  services: {
    title: "Servicios",
    description: "Contratos por cliente, categoría, estado y fecha de inicio.",
    defaultSort: "date",
    sorts: {
      date: "Fecha de inicio",
      client: "Cliente",
      service: "Servicio",
      category: "Categoría",
      status: "Estado",
    },
    statuses: {
      pending: "Pendiente",
      active: "Activo",
      suspended: "Suspendido",
      completed: "Completado",
      cancelled: "Cancelado",
    },
    columns: [
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "service_name", label: "Servicio" },
      { key: "category_name", label: "Categoría" },
      { key: "status", label: "Estado", kind: "status" },
      { key: "start_date", label: "Inicio", kind: "date" },
      { key: "billing_mode", label: "Facturación" },
    ],
  },
  charges: {
    title: "Cargos y facturación",
    description:
      "Cargos vigentes y cancelados con aplicación y saldo derivados.",
    defaultSort: "date",
    sorts: {
      date: "Fecha",
      client: "Cliente",
      amount: "Monto",
      balance: "Saldo",
      due: "Vencimiento",
    },
    statuses: {
      pending: "Pendiente",
      partial: "Parcial",
      paid: "Pagado",
      cancelled: "Cancelado",
    },
    columns: [
      { key: "charge_date", label: "Fecha", kind: "date" },
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "concept", label: "Concepto", kind: "charge" },
      { key: "original_amount", label: "Monto", kind: "money" },
      { key: "applied_amount", label: "Aplicado", kind: "money" },
      { key: "remaining_amount", label: "Saldo", kind: "money" },
      { key: "due_date", label: "Vencimiento", kind: "date" },
      { key: "status", label: "Estado", kind: "status" },
    ],
  },
  payments: {
    title: "Pagos e ingresos",
    description:
      "Pagos por fecha, método, estado y distribución aplicada/no aplicada.",
    defaultSort: "date",
    sorts: {
      date: "Fecha",
      client: "Cliente",
      amount: "Monto",
      method: "Método",
      status: "Estado",
    },
    statuses: { draft: "Borrador", confirmed: "Confirmado", voided: "Anulado" },
    columns: [
      { key: "payment_date", label: "Fecha", kind: "date" },
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "reference_number", label: "Referencia", kind: "payment" },
      { key: "method_name", label: "Método" },
      { key: "amount", label: "Monto", kind: "money" },
      { key: "applied_amount", label: "Aplicado", kind: "money" },
      { key: "unapplied_amount", label: "No aplicado", kind: "money" },
      { key: "status", label: "Estado", kind: "status" },
      { key: "receipt_number", label: "Recibo", kind: "receipt" },
    ],
  },
  receivables: {
    title: "Cuentas por cobrar",
    description: "Cartera derivada de Fase 5, separada por cliente y moneda.",
    defaultSort: "outstanding",
    sorts: {
      client: "Cliente",
      outstanding: "Saldo pendiente",
      overdue: "Saldo vencido",
      due: "Vencimiento",
    },
    statuses: {
      outstanding: "Con saldo",
      overdue: "Vencido",
      current: "Al día",
    },
    columns: [
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "currency_code", label: "Moneda" },
      { key: "outstanding_balance", label: "Saldo pendiente", kind: "money" },
      { key: "overdue_balance", label: "Saldo vencido", kind: "money" },
      { key: "not_due_balance", label: "No vencido", kind: "money" },
      { key: "unapplied_credit", label: "Crédito no aplicado", kind: "money" },
      {
        key: "oldest_open_due_date",
        label: "Vencimiento más antiguo",
        kind: "date",
      },
    ],
  },
  aging: {
    title: "Morosidad y aging",
    description: "Antigüedad de saldos abiertos; crédito no aplicado excluido.",
    defaultSort: "overdue",
    sorts: {
      client: "Cliente",
      overdue: "Total vencido",
      "1_30": "1–30",
      "31_60": "31–60",
      "61_90": "61–90",
      "90_plus": "90+",
    },
    columns: [
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "currency_code", label: "Moneda" },
      { key: "current_balance", label: "Al corriente", kind: "money" },
      { key: "balance_1_30", label: "1–30", kind: "money" },
      { key: "balance_31_60", label: "31–60", kind: "money" },
      { key: "balance_61_90", label: "61–90", kind: "money" },
      { key: "balance_90_plus", label: "90+", kind: "money" },
      { key: "total_overdue", label: "Total vencido", kind: "money" },
    ],
  },
  bank: {
    title: "Reporte Bancario / Consolidado de Pagos",
    description:
      "Consolidado administrativo de pagos; no corresponde a un formato bancario homologado.",
    defaultSort: "date",
    sorts: {
      date: "Fecha",
      client: "Cliente",
      amount: "Monto",
      method: "Método",
      status: "Estado",
      reference: "Referencia",
    },
    statuses: { draft: "Borrador", confirmed: "Confirmado", voided: "Anulado" },
    columns: [
      { key: "payment_date", label: "Fecha", kind: "date" },
      { key: "client_name", label: "Cliente", kind: "client" },
      { key: "client_code", label: "Código" },
      { key: "reference_number", label: "Referencia", kind: "payment" },
      { key: "method_name", label: "Método de pago" },
      { key: "amount", label: "Monto", kind: "money" },
      { key: "currency_code", label: "Moneda" },
      { key: "applied_amount", label: "Aplicado", kind: "money" },
      { key: "unapplied_amount", label: "No aplicado", kind: "money" },
      { key: "receipt_number", label: "Recibo", kind: "receipt" },
      { key: "status", label: "Estado", kind: "status" },
    ],
  },
};

export function isReportType(value: string): value is ReportType {
  return (reportTypes as readonly string[]).includes(value);
}
