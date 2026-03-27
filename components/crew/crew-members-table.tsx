"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { changeCrewRole } from "@/app/actions/crew";
import { toast } from "sonner";

interface CrewMember {
  id: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  role: { id: string; name: string };
  inviter: { name: string | null } | null;
  invitedAt: Date;
  acceptedAt: Date | null;
}

interface Role {
  id: string;
  name: string;
}

interface CrewMembersTableProps {
  members: CrewMember[];
  owner: { id: string; name: string | null; email: string } | null | undefined;
  roles: Role[];
  layoutId: string;
  isOwner: boolean;
  canEditCrew: boolean;
}

export function CrewMembersTable({
  members,
  owner,
  roles,
  layoutId,
  canEditCrew,
}: CrewMembersTableProps) {
  const [changingRole, setChangingRole] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, roleId: string) {
    setChangingRole(memberId);
    const result = await changeCrewRole({ layoutId, memberId, roleId });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role updated");
    }
    setChangingRole(null);
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left p-3 font-medium">Member</th>
            <th className="text-left p-3 font-medium">Role</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Joined</th>
            {canEditCrew && <th className="text-right p-3 font-medium w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {owner && (
            <tr className="border-b">
              <td className="p-3">
                <div className="font-medium">{owner.name || "Unknown"}</div>
                <div className="text-xs text-muted-foreground">{owner.email}</div>
              </td>
              <td className="p-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400">
                  Owner
                </span>
              </td>
              <td className="p-3">
                <span className="text-green-500">● Active</span>
              </td>
              <td className="p-3 text-muted-foreground">—</td>
              {canEditCrew && <td className="p-3">—</td>}
            </tr>
          )}
          {members.map((member) => (
            <tr key={member.id} className="border-b last:border-0">
              <td className="p-3">
                <div className="font-medium">
                  {member.user.name || member.user.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.user.email}
                </div>
              </td>
              <td className="p-3">
                {canEditCrew ? (
                  <Select
                    value={member.role.id}
                    onValueChange={(value) => handleRoleChange(member.id, value)}
                    disabled={changingRole === member.id}
                  >
                    <SelectTrigger className="w-36 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                    {member.role.name}
                  </span>
                )}
              </td>
              <td className="p-3">
                {member.acceptedAt ? (
                  <span className="text-green-500">● Active</span>
                ) : (
                  <span className="text-yellow-500">◯ Pending</span>
                )}
              </td>
              <td className="p-3 text-muted-foreground">
                {member.acceptedAt
                  ? new Date(member.acceptedAt).toLocaleDateString()
                  : `Invited ${new Date(member.invitedAt).toLocaleDateString()}`}
              </td>
              {canEditCrew && (
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/railroad/${layoutId}/crew/${member.id}/remove`}>
                          Remove
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td
                colSpan={canEditCrew ? 5 : 4}
                className="p-8 text-center text-muted-foreground"
              >
                No crew members yet. Invite someone to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
