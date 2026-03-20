import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default async function RollingStockPage({
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
            <h1 className="text-3xl font-bold">Freight Cars</h1>
            <p className="text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Car
        </Button>
      </div>

      {layout.freightCars.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No freight cars yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Add your first car to start building your inventory.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layout.freightCars.map((car) => (
            <Card key={car.id}>
              <CardHeader>
                <CardTitle>
                  {car.reportingMarks} {car.number}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{car.carType}</p>
                <div className="flex gap-2">
                  {car.aarTypeCode && (
                    <Badge variant="outline">{car.aarTypeCode}</Badge>
                  )}
                  <Badge
                    variant={
                      car.status === "SERVICEABLE" ? "default" : "secondary"
                    }
                  >
                    {car.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
