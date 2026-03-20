import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { db } from "@/lib/db";

export default async function EnginesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const engines = await db.engine.findMany({
    where: { layoutId: id, userId: session.user.id },
    orderBy: { road: "asc" },
  });

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
            <h1 className="text-3xl font-bold">Engines</h1>
            <p className="text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Engine
        </Button>
      </div>

      {engines.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No engines yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Add your first locomotive to your roster.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {engines.map((engine) => (
            <Card key={engine.id}>
              <CardHeader>
                <CardTitle>
                  {engine.road} #{engine.number}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {engine.model} — {engine.type}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
