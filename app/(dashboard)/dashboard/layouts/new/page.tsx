import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LayoutForm } from "@/components/layouts/layout-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewLayoutPage() {
  const session = await auth();
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/layouts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Layout</h1>
          <p className="text-muted-foreground">
            Add a new railroad layout to your collection
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <LayoutForm />
      </div>
    </div>
  );
}
