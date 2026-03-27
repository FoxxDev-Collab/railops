"use client";

import { User, Plan } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Shield,
  Trash,
  CreditCard,
  CheckCircle,
  KeyRound,
} from "lucide-react";
import {
  toggleAdminRole,
  deleteUser,
  setUserPlan,
  verifyUserEmail,
  resetUserPassword,
} from "@/app/actions/admin/users";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

type UserWithCounts = User & {
  _count: {
    layouts: number;
    locations: number;
    freightCars: number;
    locomotives: number;
    trains: number;
  };
};

export function UserManagementTable({ users }: { users: UserWithCounts[] }) {
  const router = useRouter();

  async function handleToggleRole(userId: string) {
    const result = await toggleAdminRole(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User role updated");
      router.refresh();
    }
  }

  async function handleSetPlan(userId: string, plan: Plan) {
    const result = await setUserPlan(userId, plan);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Plan set to ${plan}`);
      router.refresh();
    }
  }

  async function handleVerifyEmail(userId: string) {
    const result = await verifyUserEmail(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Email verified");
      router.refresh();
    }
  }

  async function handleResetPassword(userId: string) {
    const password = prompt("Enter new password (min 8 chars):");
    if (!password) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const result = await resetUserPassword(userId, password);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Password reset");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure? This will delete all user data.")) return;

    const result = await deleteUser(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User deleted");
      router.refresh();
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Layouts</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/users/${user.id}`} className="hover:underline text-primary">
                  {user.email}
                </Link>
              </TableCell>
              <TableCell>{user.name || "-"}</TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.plan === "OPERATOR" ? "default" : "outline"}
                >
                  {user.plan}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.emailVerified ? "default" : "outline"}>
                  {user.emailVerified ? "Yes" : "No"}
                </Badge>
              </TableCell>
              <TableCell>{user._count.layouts}</TableCell>
              <TableCell>
                {user._count.freightCars + user._count.locomotives}
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Set Plan
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => handleSetPlan(user.id, "FREE")}
                          disabled={user.plan === "FREE"}
                        >
                          Free
                          {user.plan === "FREE" && " (current)"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSetPlan(user.id, "OPERATOR")}
                          disabled={user.plan === "OPERATOR"}
                        >
                          Operator
                          {user.plan === "OPERATOR" && " (current)"}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem
                      onClick={() => handleToggleRole(user.id)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                    </DropdownMenuItem>

                    {!user.emailVerified && (
                      <DropdownMenuItem
                        onClick={() => handleVerifyEmail(user.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Verify Email
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => handleResetPassword(user.id)}
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(user.id)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
