"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeCrewMember } from "@/app/actions/crew";
import { toast } from "sonner";

interface RemoveMemberFormProps {
  layoutId: string;
  memberId: string;
  memberName: string;
  transferTargets: { id: string; name: string }[];
}

export function RemoveMemberForm({ layoutId, memberId, memberName, transferTargets }: RemoveMemberFormProps) {
  const router = useRouter();
  const [transferTo, setTransferTo] = useState(transferTargets[0]?.id || "");
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const result = await removeCrewMember({ layoutId, memberId, transferToUserId: transferTo || undefined });
    if (result.error) { toast.error(result.error); setLoading(false); return; }
    toast.success(`${memberName} has been removed`);
    router.push(`/dashboard/railroad/${layoutId}/crew`);
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
        <p className="text-sm">
          This will immediately revoke <strong>{memberName}</strong>&apos;s access to this railroad.
        </p>
      </div>
      {transferTargets.length > 0 && (
        <div className="space-y-2">
          <Label>Transfer content to</Label>
          <Select value={transferTo} onValueChange={setTransferTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {transferTargets.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="destructive" onClick={handleRemove} disabled={loading}>
          {loading ? "Removing..." : "Remove & Transfer"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}>Cancel</Button>
      </div>
    </div>
  );
}
