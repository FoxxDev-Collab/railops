import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Factory,
  Train,
  FileText,
  Route,
  Link as LinkIcon,
  ClipboardList,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { WorkflowStepper } from "@/components/operations/workflow-stepper";

export default async function OperationsGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            How Operations Work
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            A step-by-step guide to running {layout.name}
          </p>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="rounded-lg border bg-card p-6">
        <WorkflowStepper />
      </div>

      {/* Suggested Order Callout */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Set up your railroad in this order.
          </p>
          <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/70">
            Each step builds on the previous one — you need locations before
            industries, rolling stock before waybills, and trains before you can
            build consists and generate switch lists.
          </p>
        </div>
      </div>

      <Separator />

      {/* Step 1: Locations */}
      <section id="locations" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            1. Locations{" "}
            <span className="font-normal text-muted-foreground">
              — the places on your railroad
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            Locations are the named places on your railroad — yards, stations,
            sidings, junctions, and interchanges. Every other element in the
            system references locations: industries are <em>at</em> locations,
            rolling stock is <em>at</em> a location, and trains travel{" "}
            <em>between</em> locations.
          </p>
          <p className="font-medium text-foreground">
            Start here. Create your yards, towns, and interchange points before
            anything else.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/locations`}>
              Go to Locations &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 2: Industries */}
      <section id="industries" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Factory className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            2. Industries{" "}
            <span className="font-normal text-muted-foreground">
              — businesses that ship and receive goods
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            Industries are the businesses at your locations that ship and receive
            goods — a coal mine, a freight house, a lumber yard. Each industry
            lists the commodities it ships out and receives in.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Industries
            exist at Locations. Waybills reference industries as shippers and
            consignees (receivers).
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/locations`}>
              Go to Locations (industries are managed within each location) &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 3: Rolling Stock */}
      <section id="rolling-stock" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Train className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            3. Rolling Stock{" "}
            <span className="font-normal text-muted-foreground">
              — your locomotives, cars, and equipment
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            Rolling stock is everything that rides the rails — locomotives (your
            motive power), freight cars (boxcars, hoppers, gondolas, tank cars),
            passenger cars, cabooses, and maintenance-of-way equipment. Each
            piece of rolling stock has a current location on your railroad.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Rolling
            stock sits at Locations. Freight cars get paired with Waybills to
            receive shipping orders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/locomotives`}>
              Locomotives
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/rolling-stock`}>
              Freight Cars
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/passenger-cars`}>
              Passenger Cars
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/cabooses`}>
              Cabooses
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/mow-equipment`}>
              MOW Equipment
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 4: Waybills */}
      <section id="waybills" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            4. Waybills{" "}
            <span className="font-normal text-muted-foreground">
              — shipping orders that move cars
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A waybill is a shipping order — it says &ldquo;take this type of car
            from Industry A to Industry B, carrying commodity C.&rdquo; Railroad Ops
            uses a <strong className="text-foreground">4-panel waybill system</strong>:
            each panel represents one leg of a car&apos;s journey (loaded move,
            empty return, or a different load). The waybill&apos;s current panel
            determines where the car needs to go right now.
          </p>
          <p>
            When you create a waybill, you can link it to a specific freight car
            through a <strong className="text-foreground">car card</strong> (a
            pairing of one freight car to one waybill). The car card tracks where
            that car currently sits on your railroad.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Waybills
            reference Industries (shipper/consignee) and Locations
            (origin/destination). They drive the switch list logic that tells
            train crews what to do.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/waybills`}>
              Go to Waybills &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 5: Trains */}
      <section id="trains" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Route className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            5. Trains{" "}
            <span className="font-normal text-muted-foreground">
              — routes and schedules across your railroad
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A train is a named service that runs between an origin and
            destination, with stops along the way — like &ldquo;Train 101,
            Grafton Yard to Elkins, stopping at Spruce Knob Mine.&rdquo; Each
            train has a class (manifest, local, unit, passenger) and a service
            type.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Trains
            reference Locations for their origin, destination, and stops.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/trains`}>
              Go to Trains &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 6: Consists */}
      <section id="consists" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LinkIcon className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            6. Consists{" "}
            <span className="font-normal text-muted-foreground">
              — build your train for a run
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A consist (pronounced &ldquo;CON-sist&rdquo;) is the actual makeup
            of a train for a specific run — which locomotives are pulling, which
            cars are in the train, and in what order. You build a consist by
            adding rolling stock from the locations along the train&apos;s route.
          </p>
          <p>
            When you add a freight car that has an active car card, the system
            knows that car has a waybill directing it somewhere. This is what
            drives the switch list.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Consists
            are built from Rolling Stock and belong to a Train. They feed into
            Switch Lists.
          </p>
        </div>
        <div className="pl-11">
          <p className="text-xs text-muted-foreground italic">
            Build consists from any train&apos;s detail page.
          </p>
        </div>
      </section>

      <Separator />

      {/* Step 7: Switch Lists */}
      <section id="switch-lists" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            7. Switch Lists{" "}
            <span className="font-normal text-muted-foreground">
              — crew instructions for pickups and setouts
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A switch list is the crew&apos;s work order — it tells the conductor
            which cars to <strong className="text-foreground">pick up</strong>{" "}
            and <strong className="text-foreground">set out</strong> at each stop
            along the train&apos;s route. Railroad Ops generates switch lists
            automatically by looking at each freight car in the consist, reading
            its waybill, and matching the waybill&apos;s origin/destination
            against the train&apos;s stops.
          </p>
          <p>
            If a car&apos;s waybill says &ldquo;deliver to Elkins&rdquo; and the
            train stops at Elkins, the switch list says &ldquo;SETOUT at
            Elkins.&rdquo; If a car is sitting at Spruce Knob Mine and its
            waybill says it originates there, the switch list says &ldquo;PICKUP
            at Spruce Knob Mine.&rdquo;
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Switch
            lists are generated from a Consist + its Train&apos;s stops + the
            Waybills on each car.
          </p>
        </div>
        <div className="pl-11">
          <p className="text-xs text-muted-foreground italic">
            Generate switch lists from any train&apos;s detail page after
            building a consist.
          </p>
        </div>
      </section>

      <Separator />

      {/* Bonus: Operating Sessions */}
      <section id="sessions" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PlayCircle className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            Operating Sessions{" "}
            <span className="font-normal text-muted-foreground">
              — tie it all together
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            An operating session ties it all together — it&apos;s a scheduled run
            of your railroad where one or more trains operate. Assign trains to a
            session, build their consists, generate switch lists, and run your
            railroad.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/sessions`}>
              Go to Sessions &rarr;
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
