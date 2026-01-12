"use client";

import { User, Role } from "@prisma/client";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, Trash, Eye } from "lucide-react";
import { toggleAdminRole, deleteUser } from "@/app/actions/admin/users";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type UserWithCounts = User & {
  _count: {
    layouts: number;
    stations: number;
    rollingStock: number;
    routes: number;
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
            <TableHead>Layouts</TableHead>
            <TableHead>Stations</TableHead>
            <TableHead>Rolling Stock</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>{user.name || "-"}</TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>{user._count.layouts}</TableCell>
              <TableCell>{user._count.stations}</TableCell>
              <TableCell>{user._count.rollingStock}</TableCell>
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
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleRole(user.id)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Toggle Admin Role
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
