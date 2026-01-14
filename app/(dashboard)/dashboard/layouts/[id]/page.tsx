import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { LayoutForm } from "@/components/layouts/layout-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditLayoutPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) {
    redirect("/auth/login");
  }

  const layout = await getLayout(params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/layouts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Layout</h1>
          <p className="text-muted-foreground">
            Update your layout information
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <LayoutForm initialData={layout} />
      </div>
    </div>
  );
}
