import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ListOrdered } from "lucide-react";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { TrainBuilder } from "@/components/consists/train-builder";
import { OperationsHint } from "@/components/operations/operations-hint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; trainId: string }>;
}): Promise<Metadata> {
  const { trainId } = await params;
  const train = await db.train.findUnique({
    where: { id: trainId },
    select: { trainNumber: true, trainName: true },
  });
  return {
    title: train
      ? `Train ${train.trainNumber}${train.trainName ? ` — ${train.trainName}` : ""}`
      : "Train Detail",
  };
}

const TRAIN_CLASS_LABELS: Record<string, string> = {
  MANIFEST: "Manifest",
  UNIT: "Unit",
  INTERMODAL: "Intermodal",
  LOCAL: "Local",
  PASSENGER: "Passenger",
  WORK: "Work",
  LIGHT_ENGINE: "Light Engine",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  FREIGHT: "Freight",
  PASSENGER: "Passenger",
  MIXED: "Mixed",
  MOW: "MOW",
};

const SERVICE_TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  FREIGHT: "default",
  PASSENGER: "secondary",
  MIXED: "outline",
  MOW: "outline",
};

export default async function TrainDetailPage({
  params,
}: {
  params: Promise<{ id: string; trainId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id: layoutId, trainId } = await params;
  const userId = session.user.id;

  const train = await db.train.findFirst({
    where: { id: trainId, userId, layoutId },
    include: { origin: true, destination: true },
  });

  if (!train) redirect(`/dashboard/railroad/${layoutId}/trains`);

  // Get or create the base consist (no session)
  let consist = await db.trainConsist.findFirst({
    where: { trainId, sessionId: null },
    include: {
      positions: {
        orderBy: { position: "asc" },
        include: {
          locomotive: { include: { silhouette: true } },
          freightCar: { include: { silhouette: true } },
          passengerCar: { include: { silhouette: true } },
          mowEquipment: { include: { silhouette: true } },
          caboose: { include: { silhouette: true } },
        },
      },
    },
  });

  if (!consist) {
    consist = await db.trainConsist.create({
      data: { trainId },
      include: {
        positions: {
          orderBy: { position: "asc" },
          include: {
            locomotive: { include: { silhouette: true } },
            freightCar: { include: { silhouette: true } },
            passengerCar: { include: { silhouette: true } },
            mowEquipment: { include: { silhouette: true } },
            caboose: { include: { silhouette: true } },
          },
        },
      },
    });
  }

  // Load layout rolling stock for the add-equipment panel
  const layout = await getLayout(layoutId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pickSilhouette = (item: any) =>
    item.silhouette
      ? { filePath: item.silhouette.filePath, darkPath: item.silhouette.darkPath, name: item.silhouette.name }
      : null;

  const availableStock = {
    locomotives: layout.locomotives.map((l) => ({
      id: l.id,
      road: l.road,
      number: l.number,
      silhouette: pickSilhouette(l),
    })),
    freightCars: layout.freightCars.map((c) => ({
      id: c.id,
      reportingMarks: c.reportingMarks,
      number: c.number,
      silhouette: pickSilhouette(c),
    })),
    passengerCars: layout.passengerCars.map((c) => ({
      id: c.id,
      reportingMarks: c.reportingMarks,
      number: c.number,
      silhouette: pickSilhouette(c),
    })),
    cabooses: layout.cabooses.map((c) => ({
      id: c.id,
      reportingMarks: c.reportingMarks,
      number: c.number,
      silhouette: pickSilhouette(c),
    })),
    mowEquipment: layout.mowEquipment.map((c) => ({
      id: c.id,
      reportingMarks: c.reportingMarks,
      number: c.number,
      silhouette: pickSilhouette(c),
    })),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-0.5">
            <Link href={`/dashboard/railroad/${layoutId}/trains`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="text-4xl font-bold tracking-tight font-mono">
                {train.trainNumber}
              </h1>
              {train.trainName && (
                <span className="text-xl text-muted-foreground font-medium">
                  {train.trainName}
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <Badge variant="secondary" className="font-normal">
                {TRAIN_CLASS_LABELS[train.trainClass] ?? train.trainClass}
              </Badge>
              <Badge
                variant={
                  SERVICE_TYPE_VARIANTS[train.serviceType] ?? "outline"
                }
                className="font-normal"
              >
                {SERVICE_TYPE_LABELS[train.serviceType] ?? train.serviceType}
              </Badge>
              {!train.isActive && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-14">
        <span className="font-medium text-foreground">
          {train.origin?.name ?? "Origin TBD"}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-foreground">
          {train.destination?.name ?? "Destination TBD"}
        </span>
        {train.departureTime && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span>Departs {train.departureTime}</span>
          </>
        )}
        {train.symbol && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="font-mono">{train.symbol}</span>
          </>
        )}
      </div>

      <Separator />

      <OperationsHint pageKey="hint-consists" title="Build your consist" railroadId={layoutId} guideSection="#consists">
        Build your consist by adding rolling stock. Cars with active waybills will appear on the switch list.
      </OperationsHint>

      {/* Consist section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Consist</h2>
            <p className="text-sm text-muted-foreground">
              {consist.positions.length === 0
                ? "No equipment assigned"
                : `${consist.positions.length} unit${consist.positions.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <TrainBuilder
          trainId={trainId}
          layoutId={layoutId}
          consist={consist}
          availableStock={availableStock}
        />
      </div>

      <Separator />

      {/* Switch list link */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium">Switch List</p>
          <p className="text-xs text-muted-foreground">
            Generate a switch list for this train&apos;s consist
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link
            href={`/dashboard/railroad/${layoutId}/trains/${trainId}/switch-list`}
          >
            <ListOrdered className="mr-2 h-4 w-4" />
            View Switch List
          </Link>
        </Button>
      </div>
    </div>
  );
}
