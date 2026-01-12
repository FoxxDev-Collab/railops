import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/app/actions/admin/users";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { Button } from "@/components/ui/button";

export default async function UsersManagementPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users and their permissions
          </p>
        </div>
        <Button>Create User</Button>
      </div>

      <UserManagementTable users={users} />
    </div>
  );
}
