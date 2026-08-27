import {
  ChangePasswordForm,
  UsernameForm,
} from "@/components/admin/profile-settings-forms";
import { requireUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const principal = await requireUser();
  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
        Cuenta
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Mi perfil</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Administra tus identificadores de acceso sin cambiar tu correo, rol ni
        permisos.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Nombre de usuario</h2>
          <div className="mt-5">
            <UsernameForm username={principal.username} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Contraseña</h2>
          <div className="mt-5">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </div>
  );
}
