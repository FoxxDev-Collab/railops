"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye, UserCog, CheckCircle, CreditCard, Trash2,
} from "lucide-react";
import { toggleAdminRole, verifyUserEmail, deleteUser } from "@/app/actions/admin/users";
import { adminCancelSubscription, adminGrantPlan } from "@/app/actions/admin/billing";
import { startImpersonation } from "@/app/actions/admin/impersonate";
import type { Plan, UserRole } from "@prisma/client";

interface TabActionsProps {
  user: {
    id: string;
    email: string;
    role: UserRole;
    plan: Plan;
    emailVerified: Date | null;
  };
  adminId: string;
}

export function TabActions({ user, adminId }: TabActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isCurrentUser = user.id === adminId;

  function handleAction(action: () => Promise<{ success?: boolean; error?: string } | void>) {
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Action completed");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isCurrentUser && (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => startImpersonation(user.id))}
              disabled={isPending}
            >
              <Eye className="h-3.5 w-3.5" /> Impersonate User
            </Button>
          )}
          {!isCurrentUser && (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => toggleAdminRole(user.id))}
              disabled={isPending}
            >
              <UserCog className="h-3.5 w-3.5" />
              {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
            </Button>
          )}
          {!user.emailVerified && (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => verifyUserEmail(user.id))}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Verify Email
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user.plan === "FREE" ? (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => adminGrantPlan(user.id))}
              disabled={isPending}
            >
              <CreditCard className="h-3.5 w-3.5" /> Grant Operator Plan
            </Button>
          ) : (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => adminCancelSubscription(user.id))}
              disabled={isPending}
            >
              <CreditCard className="h-3.5 w-3.5" /> Revert to Free Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {!isCurrentUser && (
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive" size="sm" className="justify-start gap-2"
              onClick={() => {
                if (confirm(`Delete ${user.email}? This cannot be undone.`)) {
                  handleAction(() => deleteUser(user.id));
                }
              }}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete User
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
