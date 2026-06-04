import { PageHeader } from "@/components/dashboard/ui";
import { UsersTable } from "@/components/admin/users-table";
import { currentUser } from "@/lib/current-user";
import { listUsers, getPlanes } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AdminUsuarios() {
  const me = await currentUser();
  if (!me) redirect("/login");

  const [users, planes] = await Promise.all([listUsers(), getPlanes({ all: true })]);
  const planOpts = planes.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} cuentas. Crea, edita o elimina usuarios y gestiona su plan y rol.`}
      />
      <UsersTable users={users} planes={planOpts} currentAdminId={me.id} />
    </div>
  );
}
