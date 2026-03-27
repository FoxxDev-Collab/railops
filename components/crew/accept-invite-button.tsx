"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinViaInviteLink } from "@/app/actions/invite-links";
import { acceptEmailInvite } from "@/app/actions/crew";
import { toast } from "sonner";

interface AcceptInviteButtonProps {
  type: "link" | "email";
  code?: string;
  token?: string;
}

export function AcceptInviteButton({ type, code, token }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);

    if (type === "link" && code) {
      const result = await joinViaInviteLink(code);
      if (result.error) { toast.error(result.error); setLoading(false); return; }
      toast.success(`Joined ${result.railroadName}!`);
      router.push(`/dashboard/railroad/${result.layoutId}`);
    } else if (type === "email" && token) {
      const result = await acceptEmailInvite(token);
      if (result.error) { toast.error(result.error); setLoading(false); return; }
      toast.success("Invitation accepted!");
      router.push(`/dashboard/railroad/${result.layoutId}`);
    }
  }

  return (
    <Button onClick={handleAccept} disabled={loading} className="w-full">
      {loading ? "Joining..." : "Join Railroad"}
    </Button>
  );
}
