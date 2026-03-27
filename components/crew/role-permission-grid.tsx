"use client";

import { useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { CREW_SECTIONS, SECTION_LABELS, type CrewSection } from "@/lib/crew/permissions";
import { updateRole } from "@/app/actions/roles";
import { toast } from "sonner";

interface RolePermission {
  section: string;
  canView: boolean;
  canEdit: boolean;
}

interface RoleData {
  id: string;
  name: string;
  isDefault: boolean;
  permissions: RolePermission[];
  _count: { members: number };
}

interface RolePermissionGridProps {
  roles: RoleData[];
  layoutId: string;
  canEdit: boolean;
}

export function RolePermissionGrid({ roles, layoutId, canEdit }: RolePermissionGridProps) {
  const [saving, setSaving] = useState<string | null>(null);

  async function handleToggle(
    role: RoleData,
    section: string,
    field: "canView" | "canEdit",
    value: boolean
  ) {
    setSaving(role.id);

    const updatedPermissions = CREW_SECTIONS.map((s) => {
      const existing = role.permissions.find((p) => p.section === s);
      if (s === section) {
        const newPerm = {
          section: s,
          canView: field === "canView" ? value : (existing?.canView ?? true),
          canEdit: field === "canEdit" ? value : (existing?.canEdit ?? false),
        };
        if (field === "canEdit" && value) newPerm.canView = true;
        if (field === "canView" && !value) newPerm.canEdit = false;
        return newPerm;
      }
      return {
        section: s,
        canView: existing?.canView ?? true,
        canEdit: existing?.canEdit ?? false,
      };
    });

    const result = await updateRole({ roleId: role.id, layoutId, permissions: updatedPermissions });
    if (result.error) toast.error(result.error);
    setSaving(null);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide min-w-32">
              Section
            </th>
            {roles.map((role) => (
              <th key={role.id} colSpan={2} className="text-center p-3 font-medium text-xs uppercase tracking-wide">
                <Link href={`/dashboard/railroad/${layoutId}/crew/roles/${role.id}`} className="hover:underline">
                  {role.name}
                </Link>
                <div className="text-muted-foreground font-normal normal-case mt-0.5">
                  {role._count.members} member{role._count.members !== 1 ? "s" : ""}
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b">
            <th></th>
            {roles.map((role) => (
              <th key={role.id} colSpan={2} className="text-center p-1">
                <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                  <span>View</span>
                  <span>Edit</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CREW_SECTIONS.map((section) => (
            <tr key={section} className="border-b last:border-0">
              <td className="p-3 font-medium">{SECTION_LABELS[section as CrewSection]}</td>
              {roles.map((role) => {
                const perm = role.permissions.find((p) => p.section === section);
                return (
                  <td key={role.id} colSpan={2} className="p-3">
                    <div className="flex justify-center gap-6">
                      <Checkbox
                        checked={perm?.canView ?? false}
                        onCheckedChange={(checked) => handleToggle(role, section, "canView", !!checked)}
                        disabled={!canEdit || saving === role.id}
                      />
                      <Checkbox
                        checked={perm?.canEdit ?? false}
                        onCheckedChange={(checked) => handleToggle(role, section, "canEdit", !!checked)}
                        disabled={!canEdit || saving === role.id}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
