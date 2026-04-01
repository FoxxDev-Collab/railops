import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { LayoutForm } from "@/components/layouts/layout-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TrackPlanImageUpload } from "@/components/track-plan/image-upload";

export default async function RailroadSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Railroad Settings</h1>
          <p className="text-muted-foreground">
            Update {layout.name} configuration
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <LayoutForm initialData={layout} />
        <div className="mt-6">
          <TrackPlanImageUpload
            layoutId={id}
            currentImageUrl={layout.imageUrl}
          />
        </div>
      </div>
    </div>
  );
}
