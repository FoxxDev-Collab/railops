import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, Wrench } from "lucide-react";
import { MOWEquipmentCardList } from "@/components/mow-equipment/mow-equipment-card-list";

export default async function MOWEquipmentPage({
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MOW Equipment</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.mowEquipment.length} unit
              {layout.mowEquipment.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button asChild className="transition-all duration-150 hover:shadow-md">
          <Link href={`/dashboard/railroad/${id}/mow-equipment/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Link>
        </Button>
      </div>

      {layout.mowEquipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <Wrench className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No MOW equipment yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add tampers, cranes, ballast cars, and other maintenance-of-way
              equipment to your fleet inventory.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/mow-equipment/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Unit
            </Link>
          </Button>
        </div>
      ) : (
        <MOWEquipmentCardList mowEquipment={layout.mowEquipment} layoutId={id} />
      )}
    </div>
  );
}
