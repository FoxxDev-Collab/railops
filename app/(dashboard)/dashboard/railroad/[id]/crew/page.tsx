import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getCrewMembers } from "@/app/actions/crew";
import { getRoles } from "@/app/actions/roles";
import { getInviteLinks } from "@/app/actions/invite-links";
import { getCrewContext } from "@/lib/crew/context";
import { CrewMembersTable } from "@/components/crew/crew-members-table";
import { InviteLinksList } from "@/components/crew/invite-links-list";

export default async function CrewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);
  const ctx = await getCrewContext(id);
  if (!ctx) redirect("/dashboard");

  const [{ owner, members }, roles, inviteLinks] = await Promise.all([
    getCrewMembers(id),
    getRoles(id),
    getInviteLinks(id),
  ]);

  const canEditCrew = ctx.isOwner || !!ctx.permissions.crew?.canEdit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Crew</h1>
            <p className="text-sm text-muted-foreground">
              {layout.name} — {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {canEditCrew && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/railroad/${id}/crew/invite-link`}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Create Invite Link
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/railroad/${id}/crew/invite`}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Link>
            </Button>
          </div>
        )}
      </div>

      <CrewMembersTable
        members={members}
        owner={owner}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        layoutId={id}
        isOwner={ctx.isOwner}
        canEditCrew={canEditCrew}
      />

      <InviteLinksList links={inviteLinks} layoutId={id} canEdit={canEditCrew} />

      {canEditCrew && (
        <div className="pt-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/railroad/${id}/crew/roles`}>Manage Roles & Permissions</Link>
          </Button>
        </div>
      )}

      {!ctx.isOwner && (
        <div className="pt-4 border-t">
          <Button variant="ghost" className="text-destructive" asChild>
            <Link href={`/dashboard/railroad/${id}/crew/leave`}>Leave Railroad</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
