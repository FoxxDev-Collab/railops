import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default async function LocomotivesPage({
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
            <h1 className="text-3xl font-bold">Locomotives</h1>
            <p className="text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Locomotive
        </Button>
      </div>

      {layout.locomotives.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No locomotives yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Add your first locomotive to start building your motive power
              roster.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layout.locomotives.map((loco) => (
            <Card key={loco.id}>
              <CardHeader>
                <CardTitle>
                  {loco.road} {loco.number}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{loco.model}</p>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {loco.locomotiveType.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={
                      loco.status === "SERVICEABLE" ? "default" : "secondary"
                    }
                  >
                    {loco.status}
                  </Badge>
                </div>
                {loco.dccAddress && (
                  <p className="text-xs text-muted-foreground">
                    DCC: {loco.dccAddress}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
