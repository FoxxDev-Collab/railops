"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Trash2,
  UserCog,
  CheckCircle,
  XCircle,
  MapPin,
  Train,
  TrainFront,
  FileText,
  PlayCircle,
  Eye,
} from "lucide-react";
import { toggleAdminRole, verifyUserEmail, deleteUser } from "@/app/actions/admin/users";
import { adminCancelSubscription, adminGrantPlan } from "@/app/actions/admin/billing";
import { startImpersonation } from "@/app/actions/admin/impersonate";
import type { Plan, UserRole as Role } from "@prisma/client";

interface LayoutInfo {
  id: string;
  name: string;
  description: string | null;
  _count: {
    locations: number;
    freightCars: number;
    locomotives: number;
    trains: number;
  };
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: Plan;
  emailVerified: Date | null;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  planExpiresAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  layouts: LayoutInfo[];
  _count: {
    layouts: number;
    locations: number;
    freightCars: number;
    locomotives: number;
    trains: number;
    waybills: number;
    sessions: number;
  };
}

interface UserDetailViewProps {
  user: UserDetail;
  adminId: string;
}

export function UserDetailView({ user, adminId }: UserDetailViewProps) {
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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* User info + actions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{user.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <Badge variant={user.plan === "OPERATOR" ? "default" : "outline"}>
                  {user.plan}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email Verified</p>
                {user.emailVerified ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {new Date(user.emailVerified).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <XCircle className="h-3.5 w-3.5" />
                    Unverified
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="text-sm">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stripe Customer</p>
                <p className="text-sm font-mono text-xs">
                  {user.stripeCustomerId || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Railroads */}
        <Card>
          <CardHeader>
            <CardTitle>Railroads ({user.layouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.layouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No railroads created</p>
            ) : (
              <div className="space-y-3">
                {user.layouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="text-sm font-medium">{layout.name}</p>
                      {layout.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {layout.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {layout._count.locations}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrainFront className="h-3 w-3" /> {layout._count.locomotives}
                      </span>
                      <span className="flex items-center gap-1">
                        <Train className="h-3 w-3" /> {layout._count.freightCars}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions sidebar */}
      <div className="space-y-6">
        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Asset Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Railroads", count: user._count.layouts, icon: MapPin },
              { label: "Locations", count: user._count.locations, icon: MapPin },
              { label: "Locomotives", count: user._count.locomotives, icon: TrainFront },
              { label: "Freight Cars", count: user._count.freightCars, icon: Train },
              { label: "Trains", count: user._count.trains, icon: Train },
              { label: "Waybills", count: user._count.waybills, icon: FileText },
              { label: "Sessions", count: user._count.sessions, icon: PlayCircle },
            ].map(({ label, count, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
                <span className="font-mono tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Impersonate */}
            {!isCurrentUser && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleAction(() => startImpersonation(user.id))}
                disabled={isPending}
              >
                <Eye className="h-3.5 w-3.5" /> Impersonate User
              </Button>
            )}

            {/* Toggle role */}
            {!isCurrentUser && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleAction(() => toggleAdminRole(user.id))}
                disabled={isPending}
              >
                <UserCog className="h-3.5 w-3.5" />
                {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
              </Button>
            )}

            {/* Verify email */}
            {!user.emailVerified && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleAction(() => verifyUserEmail(user.id))}
                disabled={isPending}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Verify Email
              </Button>
            )}

            {/* Plan management */}
            {user.plan === "FREE" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleAction(() => adminGrantPlan(user.id))}
                disabled={isPending}
              >
                <CreditCard className="h-3.5 w-3.5" /> Grant Operator Plan
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleAction(() => adminCancelSubscription(user.id))}
                disabled={isPending}
              >
                <CreditCard className="h-3.5 w-3.5" /> Revert to Free Plan
              </Button>
            )}

            {/* Delete */}
            {!isCurrentUser && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  if (confirm(`Delete ${user.email}? This cannot be undone.`)) {
                    handleAction(() => deleteUser(user.id));
                  }
                }}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete User
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
