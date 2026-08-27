import { AdminShell } from "@/components/admin/admin-shell";
import { hasPermission, requireUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const principal = await requireUser();
  const displayName = principal.fullName || principal.email || "Usuario DIACA";
  const canManageUsers = hasPermission(principal, "users.manage");
  const canReadClients = hasPermission(principal, "clients.read");
  const canReadServices = hasPermission(principal, "services.read");
  const canReadCharges = hasPermission(principal, "charges.read");
  const canReadPayments = hasPermission(principal, "payments.read");
  const canReadStatements = canReadCharges && canReadPayments;
  const canReadReports = hasPermission(principal, "reports.read");
  const canReadTasks = hasPermission(principal, "tasks.read");

  return (
    <AdminShell
      displayName={displayName}
      roleName={principal.roleName}
      permissions={{
        clients: canReadClients,
        services: canReadServices,
        tasks: canReadTasks,
        charges: canReadCharges,
        payments: canReadPayments,
        statements: canReadStatements,
        reports: canReadReports,
        users: canManageUsers,
      }}
    >
      {children}
    </AdminShell>
  );
}
