"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteCrewMember } from "@/app/actions/crew";
import { toast } from "sonner";

interface InviteMemberFormProps {
  layoutId: string;
  roles: { id: string; name: string }[];
}

export function InviteMemberForm({ layoutId, roles }: InviteMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !roleId) return;

    setLoading(true);
    const result = await inviteCrewMember({ layoutId, email, roleId });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Invitation sent to ${email}`);
      router.push(`/dashboard/railroad/${layoutId}/crew`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="crew@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Invitation"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
