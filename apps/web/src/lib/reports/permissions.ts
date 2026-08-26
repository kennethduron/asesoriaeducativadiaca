import "server-only";

import { hasPermission, type Principal } from "@/lib/auth/authorization";
import type { ReportType } from "@/lib/reports/config";

export function canReadReport(principal: Principal, type: ReportType) {
  if (!hasPermission(principal, "reports.read")) return false;
  if (type === "clients") return hasPermission(principal, "clients.read");
  if (type === "services") return hasPermission(principal, "services.read");
  if (type === "charges") return hasPermission(principal, "charges.read");
  if (type === "payments") return hasPermission(principal, "payments.read");
  if (type === "bank")
    return (
      hasPermission(principal, "payments.read") &&
      hasPermission(principal, "bank_reports.generate")
    );
  return (
    hasPermission(principal, "charges.read") &&
    hasPermission(principal, "payments.read")
  );
}

export function canExportReport(principal: Principal, type: ReportType) {
  return (
    canReadReport(principal, type) && hasPermission(principal, "reports.export")
  );
}
