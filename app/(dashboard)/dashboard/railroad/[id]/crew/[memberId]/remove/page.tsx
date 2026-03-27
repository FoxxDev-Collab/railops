import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { requirePermission } from "@/lib/crew/context";
import { RemoveMemberForm } from "@/components/crew/remove-member-form";

export default async function RemoveMemberPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, memberId } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);

  const member = await db.crewMember.findFirst({
    where: { id: memberId, layoutId: id, removedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
      role: { select: { name: true } },
    },
  });

  if (!member) redirect(`/dashboard/railroad/${id}/crew`);

  const otherMembers = await db.crewMember.findMany({
    where: { layoutId: id, removedAt: null, id: { not: memberId } },
    include: { user: { select: { id: true, name: true } } },
  });

  const transferTargets = [
    { id: layout.userId, name: `${session.user.name || "Owner"} (Owner)` },
    ...otherMembers.map((m) => ({ id: m.user.id, name: m.user.name || m.user.id })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Remove Crew Member</h1>
          <p className="text-sm text-muted-foreground">
            {member.user.name || member.user.email} — {member.role.name}
          </p>
        </div>
      </div>
      <RemoveMemberForm
        layoutId={id}
        memberId={memberId}
        memberName={member.user.name || member.user.email}
        transferTargets={transferTargets}
      />
    </div>
  );
}
