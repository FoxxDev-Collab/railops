import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LayoutForm } from "@/components/layouts/layout-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewRailroadPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Your Railroad</h1>
            <p className="text-muted-foreground">
              Set up a new railroad to start managing operations
            </p>
          </div>
        </div>
        <LayoutForm />
      </div>
    </div>
  );
}
