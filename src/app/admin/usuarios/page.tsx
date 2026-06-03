import { PageHeader } from "@/components/dashboard/ui";
import { UsersTable } from "@/components/admin/users-table";
import { currentUser } from "@/lib/current-user";
import { listUsers } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AdminUsuarios() {
  const me = await currentUser();
  if (!me) redirect("/login");

  const users = await listUsers();

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} cuentas registradas. Puedes cambiar el plan o el rol de cada usuario.`}
      />
      <UsersTable users={users} currentAdminId={me.id} />
    </div>
  );
}
