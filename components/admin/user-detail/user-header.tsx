import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import type { Plan, UserRole } from "@prisma/client";

interface UserHeaderProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    plan: Plan;
    emailVerified: Date | null;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function UserHeader({ user }: UserHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
        <Link href="/admin/users">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg shrink-0">
          {getInitials(user.name, user.email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {user.name || user.email}
            </h1>
            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
              {user.role}
            </Badge>
            <Badge variant={user.plan === "PRO" ? "default" : "outline"} className="text-xs">
              {user.plan}
            </Badge>
            {user.emailVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>{user.email}</span>
            <span>·</span>
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            {user.lastLoginAt && (
              <>
                <span>·</span>
                <span>Last active {timeAgo(user.lastLoginAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
