import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { db } from "@/lib/db";
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
  Armchair,
  Container,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    href: "locations",
    label: "Locations",
    description: "Stations, yards, interchanges, sidings, and industries",
    icon: MapPin,
  },
  {
    href: "locomotives",
    label: "Locomotives",
    description: "Locomotive roster, DCC settings, and assignments",
    icon: TrainFront,
  },
  {
    href: "rolling-stock",
    label: "Freight Cars",
    description: "Boxcars, hoppers, tankers, gondolas, and flats",
    icon: Train,
  },
  {
    href: "passenger-cars",
    label: "Passenger Cars",
    description: "Coaches, sleepers, diners, and observation cars",
    icon: Armchair,
  },
  {
    href: "cabooses",
    label: "Cabooses",
    description: "Standard, bay window, and extended vision cabooses",
    icon: Container,
  },
  {
    href: "mow-equipment",
    label: "MOW Equipment",
    description: "Maintenance of way cars and equipment",
    icon: Wrench,
  },
  {
    href: "trains",
    label: "Trains",
    description: "Train consists, schedules, and stop sequences",
    icon: Route,
  },
  {
    href: "waybills",
    label: "Waybills",
    description: "Four-panel waybill system and car cards",
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

  // Set this as the user's selected layout (no revalidate — we're in a render)
  await db.user.update({
    where: { id: session.user.id },
    data: { selectedLayoutId: layout.id },
  });

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
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layout.locations.length}</div>
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
              {layout.locomotives.length + layout.freightCars.length + layout.passengerCars.length + layout.cabooses.length + layout.mowEquipment.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layout.trains.length}</div>
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
