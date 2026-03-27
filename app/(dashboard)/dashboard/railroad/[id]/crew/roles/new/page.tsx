import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { requirePermission } from "@/lib/crew/context";
import { RoleForm } from "@/components/crew/role-form";

export default async function NewRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew/roles`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Role</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>
      <RoleForm layoutId={id} mode="create" />
    </div>
  );
}
