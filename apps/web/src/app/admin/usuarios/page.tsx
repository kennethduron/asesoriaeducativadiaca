import { UserPlus } from "lucide-react";

import { inviteUserAction, updateUserAccessAction } from "@/lib/users/actions";
import { listManagedUsers } from "@/lib/users/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const messages: Record<string, string> = {
  "invalid-invite": "Revisa el nombre, correo y rol de la invitación.",
  "invite-failed": "No se pudo enviar la invitación.",
  "invite-rate-limited":
    "Se alcanzó el límite de invitaciones. Inténtalo más tarde.",
  "user-exists": "Ese correo ya pertenece a una cuenta activa o completada.",
  "invalid-access": "La asignación de acceso no es válida.",
  "role-missing": "El rol seleccionado no está disponible.",
  "access-failed":
    "No se pudo cambiar el acceso. Verifica que siempre quede un Owner activo.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ users, roles }, query] = await Promise.all([
    listManagedUsers(),
    searchParams,
  ]);
  const error = typeof query.error === "string" ? query.error : null;
  const success = typeof query.success === "string" ? query.success : null;

  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
        Acceso administrativo
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Usuarios</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        El rol se asigna antes de enviar y se conserva durante toda la
        invitación. La cuenta permanece inactiva hasta que el destinatario
        verifica el enlace y crea su contraseña.
      </p>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-900">
          {messages[error] ?? "No se pudo completar la operación."}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-900"
        >
          {success === "invited"
            ? "Invitación enviada. La cuenta se activará cuando el destinatario complete el acceso."
            : "Acceso actualizado."}
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <UserPlus className="size-5 text-amber-700" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Invitar usuario</h2>
        </div>
        <form
          action={inviteUserAction}
          className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto] xl:items-end"
        >
          <label className="text-sm font-semibold text-slate-800">
            Nombre completo
            <input
              name="full_name"
              required
              minLength={2}
              maxLength={120}
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Correo
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Rol asignado
            <select
              name="role"
              required
              defaultValue="staff"
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-11 rounded-xl bg-[#0b2341] px-5 font-semibold text-white">
            Enviar invitación
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xl font-semibold">Directorio y roles</h2>
        {users.map((user) => (
          <form
            key={user.id}
            action={updateUserAccessAction}
            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_180px_160px_auto] md:items-end"
          >
            <input type="hidden" name="user_id" value={user.id} />
            <input
              type="hidden"
              name="full_name"
              value={user.fullName ?? "Usuario DIACA"}
            />
            <input type="hidden" name="email" value={user.email} />
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {user.fullName || "Usuario DIACA"}
              </p>
              <p className="truncate text-sm text-slate-600">{user.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                {user.emailConfirmed
                  ? "Email confirmado"
                  : "Invitación pendiente"}
              </p>
            </div>
            <label className="text-sm font-semibold text-slate-800">
              Rol
              <select
                name="role"
                defaultValue={user.roleCode}
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Estado
              <select
                name="status"
                defaultValue={user.status}
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <div className="grid gap-2">
              <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800">
                Guardar acceso
              </button>
              {!user.emailConfirmed ? (
                <button
                  formAction={inviteUserAction}
                  className="min-h-11 rounded-xl bg-[#0b2341] px-5 font-semibold text-white"
                >
                  Reenviar invitación
                </button>
              ) : null}
            </div>
          </form>
        ))}
      </section>
    </div>
  );
}
