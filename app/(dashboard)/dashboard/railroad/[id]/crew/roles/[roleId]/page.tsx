import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { getRole, getRoles } from "@/app/actions/roles";
import { requirePermission } from "@/lib/crew/context";
import { RoleForm } from "@/components/crew/role-form";

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string; roleId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, roleId } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);
  const role = await getRole(roleId, id);
  if (!role) redirect(`/dashboard/railroad/${id}/crew/roles`);

  const allRoles = await getRoles(id);
  const otherRoles = allRoles.filter((r) => r.id !== roleId).map((r) => ({ id: r.id, name: r.name }));

  const memberCount = await db.crewMember.count({
    where: { roleId, layoutId: id, removedAt: null },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew/roles`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Role: {role.name}</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>
      <RoleForm
        layoutId={id}
        mode="edit"
        roleId={role.id}
        initialName={role.name}
        initialPermissions={role.permissions.map((p) => ({ section: p.section, canView: p.canView, canEdit: p.canEdit }))}
        isDefault={role.isDefault}
        memberCount={memberCount}
        otherRoles={otherRoles}
      />
    </div>
  );
}
