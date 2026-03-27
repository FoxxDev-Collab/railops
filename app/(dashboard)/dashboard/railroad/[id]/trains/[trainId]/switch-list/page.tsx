import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListOrdered, PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SwitchListContainer } from "@/components/switch-lists/switch-list-container";
import { GenerateSwitchListButton } from "@/components/switch-lists/generate-switch-list-button";
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
      ? `Switch List — Train ${train.trainNumber}`
      : "Switch List",
  };
}

export default async function SwitchListPage({
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

  const consist = await db.trainConsist.findFirst({
    where: { trainId, sessionId: null },
  });

  const backHref = `/dashboard/railroad/${layoutId}/trains/${trainId}`;

  // No consist built yet
  if (!consist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Switch List
            </p>
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              Train {train.trainNumber}
            </h1>
          </div>
        </div>

        <Separator />

        <div className="rounded-lg border border-dashed py-16 flex flex-col items-center gap-4 text-center">
          <PackageSearch className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-semibold">No consist built yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Build a consist for this train before generating a switch list.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Train
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const switchList = await db.switchList.findFirst({
    where: { consistId: consist.id },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3 print:hidden">
        <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
            <ListOrdered className="h-3 w-3" />
            Switch List
          </p>
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            Train {train.trainNumber}
            {train.trainName && (
              <span className="text-muted-foreground font-normal text-lg ml-2">
                {train.trainName}
              </span>
            )}
          </h1>
        </div>
      </div>

      <Separator className="print:hidden" />

      {/* Content */}
      {switchList ? (
        <SwitchListContainer
          switchList={switchList}
          train={train}
          consistId={consist.id}
          layoutId={layoutId}
        />
      ) : (
        <div className="rounded-lg border border-dashed py-16 flex flex-col items-center gap-4 text-center">
          <ListOrdered className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-semibold">No switch list generated yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Generate a switch list from the current consist. Cars with
              waybills assigned will be included.
            </p>
          </div>
          <GenerateSwitchListButton
            consistId={consist.id}
            layoutId={layoutId}
          />
        </div>
      )}
    </div>
  );
}
