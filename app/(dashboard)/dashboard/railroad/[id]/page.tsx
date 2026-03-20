import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { selectLayout } from "@/app/actions/layouts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  MapPin,
  Train,
  TrainFront,
  Route,
  FileText,
  PlayCircle,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    href: "stations",
    label: "Stations & Yards",
    description: "Manage stations, yards, and their industries",
    icon: MapPin,
  },
  {
    href: "rolling-stock",
    label: "Rolling Stock",
    description: "Car inventory — boxcars, hoppers, tankers, and more",
    icon: Train,
  },
  {
    href: "engines",
    label: "Engines",
    description: "Locomotive roster and assignments",
    icon: TrainFront,
  },
  {
    href: "routes",
    label: "Routes",
    description: "Train routes, schedules, and stop sequences",
    icon: Route,
  },
  {
    href: "waybills",
    label: "Waybills",
    description: "Generate and manage shipping waybills",
    icon: FileText,
  },
  {
    href: "sessions",
    label: "Operating Sessions",
    description: "Plan and run operating sessions",
    icon: PlayCircle,
  },
];

export default async function RailroadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  // Set this as the user's selected layout
  await selectLayout(layout.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{layout.name}</h1>
            <p className="text-muted-foreground">
              {layout.scale && `${layout.scale} Scale — `}
              Operations Center
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/railroad/${id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layout.stations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rolling Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {layout.rollingStock.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layout.routes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={`/dashboard/railroad/${id}/${section.href}`}
            className="group"
          >
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  {section.label}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
