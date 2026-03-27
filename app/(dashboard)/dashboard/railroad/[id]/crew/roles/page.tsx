import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getRoles } from "@/app/actions/roles";
import { getCrewContext } from "@/lib/crew/context";
import { RolePermissionGrid } from "@/components/crew/role-permission-grid";

export default async function RolesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const ctx = await getCrewContext(id);
  if (!ctx) redirect("/dashboard");

  const layout = await getLayout(id);
  const roles = await getRoles(id);
  const canEdit = ctx.isOwner || !!ctx.permissions.crew?.canEdit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}/crew`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href={`/dashboard/railroad/${id}/crew/roles/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Link>
          </Button>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        Owner always has full access. Default roles can have permissions edited but cannot be deleted or renamed.
      </div>
      <RolePermissionGrid roles={roles} layoutId={id} canEdit={canEdit} />
    </div>
  );
}
