"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Pause, Play, Trash2 } from "lucide-react";
import { toggleInviteLinkPause, revokeInviteLink } from "@/app/actions/invite-links";
import { toast } from "sonner";

interface InviteLink {
  id: string;
  code: string;
  maxUses: number | null;
  uses: number;
  expiresAt: Date | null;
  paused: boolean;
  createdAt: Date;
  role: { name: string };
  creator: { name: string | null };
}

interface InviteLinksListProps {
  links: InviteLink[];
  layoutId: string;
  canEdit: boolean;
}

export function InviteLinksList({ links, layoutId, canEdit }: InviteLinksListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCopy(code: string) {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  async function handleTogglePause(linkId: string) {
    setLoading(linkId);
    const result = await toggleInviteLinkPause(linkId, layoutId);
    if (result.error) toast.error(result.error);
    setLoading(null);
  }

  async function handleRevoke(linkId: string) {
    setLoading(linkId);
    const result = await revokeInviteLink(linkId, layoutId);
    if (result.error) toast.error(result.error);
    else toast.success("Link revoked");
    setLoading(null);
  }

  if (links.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        Active Invite Links
      </h3>
      <div className="space-y-2">
        {links.map((link) => {
          const isExpired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
          const isMaxed = link.maxUses ? link.uses >= link.maxUses : false;
          const isDisabled = link.paused || isExpired || isMaxed;

          return (
            <div
              key={link.id}
              className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                isDisabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-48">
                  /invite/{link.code}
                </code>
                <span className="text-blue-400 text-xs">{link.role.name}</span>
                {link.maxUses && (
                  <span className="text-muted-foreground text-xs">
                    {link.uses}/{link.maxUses} uses
                  </span>
                )}
                {link.expiresAt && (
                  <span className="text-muted-foreground text-xs">
                    {isExpired ? "Expired" : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                  </span>
                )}
                {link.paused && <span className="text-yellow-500 text-xs">Paused</span>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(link.code)} title="Copy link">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTogglePause(link.id)} disabled={loading === link.id} title={link.paused ? "Resume" : "Pause"}>
                    {link.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRevoke(link.id)} disabled={loading === link.id} title="Revoke">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
