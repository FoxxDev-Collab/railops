import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayouts } from "@/app/actions/layouts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function LayoutsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const layouts = await getLayouts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Layouts</h1>
          <p className="text-muted-foreground">
            Manage your railroad layouts
          </p>
        </div>
        <Button>Create Layout</Button>
      </div>

      {layouts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No layouts yet</CardTitle>
            <CardDescription>
              Create your first railroad layout to get started
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layouts.map((layout) => (
            <Card key={layout.id}>
              <CardHeader>
                <CardTitle>{layout.name}</CardTitle>
                <CardDescription>
                  {layout.scale || "No scale specified"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stations:</span>
                    <span className="font-medium">{layout._count.stations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rolling Stock:</span>
                    <span className="font-medium">{layout._count.rollingStock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Routes:</span>
                    <span className="font-medium">{layout._count.routes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
