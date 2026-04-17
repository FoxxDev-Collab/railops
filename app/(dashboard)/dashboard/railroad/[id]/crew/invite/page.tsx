import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getRoles } from "@/app/actions/roles";
import { requirePermission, getCrewContext } from "@/lib/crew/context";
import { InviteMemberForm } from "@/components/crew/invite-member-form";
import { SeatLimitCallout } from "@/components/billing/seat-limit-callout";
import { checkCrewLimit } from "@/lib/limits";

export default async function InviteMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await requirePermission(id, "crew", "edit");
  const [layout, roles, seatLimit, ctx] = await Promise.all([
    getLayout(id),
    getRoles(id),
    checkCrewLimit(id),
    getCrewContext(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Invite Member</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>
      <SeatLimitCallout
        current={seatLimit.current}
        limit={seatLimit.limit}
        canManage={!!ctx?.isOwner}
      />
      <InviteMemberForm layoutId={id} roles={roles.map((r) => ({ id: r.id, name: r.name }))} />
    </div>
  );
}
