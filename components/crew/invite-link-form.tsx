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
import { createInviteLink } from "@/app/actions/invite-links";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface InviteLinkFormProps {
  layoutId: string;
  roles: { id: string; name: string }[];
}

export function InviteLinkForm({ layoutId, roles }: InviteLinkFormProps) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [maxUses, setMaxUses] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) return;
    setLoading(true);

    let expiresAt: string | undefined;
    if (expiresIn) {
      const days = parseInt(expiresIn);
      if (days > 0) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }
    }

    const result = await createInviteLink({
      layoutId,
      roleId,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      expiresAt,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.code) {
      setGeneratedCode(result.code);
      toast.success("Invite link created");
    }
  }

  async function handleCopy() {
    if (!generatedCode) return;
    const url = `${window.location.origin}/invite/${generatedCode}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  if (generatedCode) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${generatedCode}`;
    return (
      <div className="space-y-4 max-w-md">
        <div className="p-4 rounded-lg border bg-muted/50">
          <Label className="text-xs text-muted-foreground">Invite Link</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-sm break-all">{url}</code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy}>Copy Link</Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="role">Role for new members</Label>
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
      <div className="space-y-2">
        <Label htmlFor="maxUses">Max uses (optional)</Label>
        <Input id="maxUses" type="number" min="1" placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiresIn">Expires in (days, optional)</Label>
        <Input id="expiresIn" type="number" min="1" placeholder="Never" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Link"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}>Cancel</Button>
      </div>
    </form>
  );
}
