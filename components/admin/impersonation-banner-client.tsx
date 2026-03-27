"use client";

import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { stopImpersonation } from "@/app/actions/admin/impersonate";

interface Props {
  email: string;
}

export function ImpersonationBannerClient({ email }: Props) {
  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-4 text-sm font-medium z-50">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span>
          Impersonating <strong>{email}</strong> — You are viewing as this user
        </span>
      </div>
      <form action={stopImpersonation}>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs bg-amber-600/20 border-amber-700/30 text-amber-950 hover:bg-amber-600/40"
        >
          <X className="h-3 w-3 mr-1" />
          Stop Impersonating
        </Button>
      </form>
    </div>
  );
}
