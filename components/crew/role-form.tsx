"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CREW_SECTIONS, SECTION_LABELS, type CrewSection } from "@/lib/crew/permissions";
import { createRole, updateRole, deleteRole } from "@/app/actions/roles";
import { toast } from "sonner";

interface Permission {
  section: string;
  canView: boolean;
  canEdit: boolean;
}

interface RoleFormProps {
  layoutId: string;
  mode: "create" | "edit";
  roleId?: string;
  initialName?: string;
  initialPermissions?: Permission[];
  isDefault?: boolean;
  memberCount?: number;
  otherRoles?: { id: string; name: string }[];
}

export function RoleForm({
  layoutId,
  mode,
  roleId,
  initialName = "",
  initialPermissions,
  isDefault = false,
  memberCount = 0,
  otherRoles = [],
}: RoleFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [permissions, setPermissions] = useState<Permission[]>(
    initialPermissions || CREW_SECTIONS.map((s) => ({ section: s, canView: true, canEdit: false }))
  );
  const [loading, setLoading] = useState(false);
  const [reassignRoleId, setReassignRoleId] = useState(otherRoles[0]?.id || "");

  function togglePerm(section: string, field: "canView" | "canEdit", value: boolean) {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.section !== section) return p;
        const updated = { ...p, [field]: value };
        if (field === "canEdit" && value) updated.canView = true;
        if (field === "canView" && !value) updated.canEdit = false;
        return updated;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === "create") {
      const result = await createRole({ layoutId, name, permissions });
      if (result.error) { toast.error(result.error); setLoading(false); return; }
      toast.success("Role created");
    } else if (roleId) {
      const result = await updateRole({ roleId, layoutId, name: isDefault ? undefined : name, permissions });
      if (result.error) { toast.error(result.error); setLoading(false); return; }
      toast.success("Role updated");
    }
    router.push(`/dashboard/railroad/${layoutId}/crew/roles`);
  }

  async function handleDelete() {
    if (!roleId) return;
    setLoading(true);
    const result = await deleteRole({
      roleId,
      layoutId,
      reassignToRoleId: memberCount > 0 ? reassignRoleId : undefined,
    });
    if (result.error) { toast.error(result.error); setLoading(false); return; }
    toast.success("Role deleted");
    router.push(`/dashboard/railroad/${layoutId}/crew/roles`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Role Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isDefault} required />
        {isDefault && <p className="text-xs text-muted-foreground">Default roles cannot be renamed.</p>}
      </div>

      <div className="space-y-3">
        <Label>Permissions</Label>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-xs uppercase text-muted-foreground">Section</th>
                <th className="text-center p-3 font-medium text-xs uppercase text-muted-foreground">View</th>
                <th className="text-center p-3 font-medium text-xs uppercase text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody>
              {CREW_SECTIONS.map((section) => {
                const perm = permissions.find((p) => p.section === section);
                return (
                  <tr key={section} className="border-b last:border-0">
                    <td className="p-3">{SECTION_LABELS[section as CrewSection]}</td>
                    <td className="p-3 text-center">
                      <Checkbox checked={perm?.canView ?? false} onCheckedChange={(checked) => togglePerm(section, "canView", !!checked)} />
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox checked={perm?.canEdit ?? false} onCheckedChange={(checked) => togglePerm(section, "canEdit", !!checked)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : mode === "create" ? "Create Role" : "Save Changes"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew/roles`)}>Cancel</Button>
      </div>

      {mode === "edit" && !isDefault && (
        <div className="pt-6 border-t space-y-4">
          <h3 className="font-medium text-destructive">Delete Role</h3>
          {memberCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This role has {memberCount} active member{memberCount !== 1 ? "s" : ""}. Reassign them to:
              </p>
              <select className="border rounded px-3 py-2 text-sm bg-background" value={reassignRoleId} onChange={(e) => setReassignRoleId(e.target.value)}>
                {otherRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>Delete Role</Button>
        </div>
      )}
    </form>
  );
}
