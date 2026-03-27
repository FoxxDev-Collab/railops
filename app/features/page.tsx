import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  MapPin,
  Train,
  TrainFront,
  FileText,
  Route as RouteIcon,
  Clock,
  Printer,
  Wrench,
  Users,
  ArrowRight,
  ArrowDown,
  Gauge,
  Building2,
  Rows3,
  ShieldCheck,
  Link2,
  BarChart3,
  Zap,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — RailOps",
  description:
    "Everything you need to run authentic model railroad operating sessions. Nine core modules replace spreadsheets, car cards, and JMRI paperwork.",
};

export default function FeaturesPage() {
  const modules = [
    {
      icon: MapPin,
      title: "Locations",
      subtitle: "Define Your Railroad's Geography",
      desc: "Create stations, yards, interchanges, junctions, staging areas, team tracks, and sidings. Each location type has purpose-built fields — yard tracks with classification types, industries with commodity assignments, interchange points with foreign road connections.",
      details: [
        "7 location types with specialized fields",
        "Industries linked to locations with commodities",
        "Yard tracks: arrival, classification, departure, RIP",
        "Interchange connections for foreign road traffic",
      ],
    },
    {
      icon: TrainFront,
      title: "Locomotive Roster",
      subtitle: "Track Every Unit in Your Fleet",
      desc: "Full roster management with road name, number, model, and era. DCC-equipped units carry decoder manufacturer, address, and speed table data. Assign locomotives to service, track their current location, and monitor maintenance status.",
      details: [
        "DCC address, decoder, and speed table fields",
        "Service assignment tracking",
        "Current location and status at a glance",
        "Maintenance history per unit",
      ],
    },
    {
      icon: Train,
      title: "Rolling Stock Registry",
      subtitle: "Every Car Accounted For",
      desc: "Catalog freight cars with AAR type codes, reporting marks, commodities, home roads, and current locations. Separate tables for freight cars, passenger cars, cabooses, and maintenance-of-way equipment — each with type-specific fields.",
      details: [
        "AAR type codes and commodity assignments",
        "Freight, passenger, caboose, and MOW types",
        "Home road and foreign road tracking",
        "Bad-order and RIP track routing",
      ],
    },
    {
      icon: FileText,
      title: "Four-Panel Waybills",
      subtitle: "Authentic Car Card System",
      desc: "RailOps generates four-panel waybills that cycle cars through load and empty moves just like the NMRA OpSIG standard. Each panel specifies origin, destination, shipper, consignee, commodity, and load status. Car cards link a freight car to its current waybill and physical position.",
      details: [
        "4 panels per waybill: loaded and empty routing",
        "Shipper and consignee industry assignments",
        "Commodity and tonnage per move",
        "Car cards track physical location in real time",
      ],
    },
    {
      icon: RouteIcon,
      title: "Trains & Consists",
      subtitle: "Build and Dispatch",
      desc: "Define trains with class, service type, origin, and destination. Build ordered consists with power, cars, and caboose — each position references any rolling stock type. Assign stop-by-stop schedules so crews know the plan before the first wheel turns.",
      details: [
        "Train class and service type classification",
        "Ordered consist positions for any rolling stock",
        "Stop-by-stop schedules with arrival times",
        "Origin, destination, and intermediate stops",
      ],
    },
    {
      icon: Printer,
      title: "Switch Lists",
      subtitle: "Print-Ready Crew Instructions",
      desc: "Generate switch lists for each stop on a train's route. Each entry is denormalized for clean printing — your crew gets exactly what they need: pickups, setouts, track assignments, and car identifiers. No ambiguity, no digging through paperwork.",
      details: [
        "Per-stop printable switch lists",
        "Pickup and setout instructions",
        "Track assignment for each car",
        "Denormalized for clean, fast printing",
      ],
    },
    {
      icon: Clock,
      title: "Operating Sessions",
      subtitle: "Plan, Run, Debrief",
      desc: "Create operating sessions, assign trains to crews, and track movements in real time. When the last train clears the main, debrief with a full record of what moved, what didn't, and what needs attention next session.",
      details: [
        "Session creation with train assignments",
        "Real-time car movement tracking",
        "Post-session debrief and reporting",
        "Historical session records",
      ],
    },
    {
      icon: Wrench,
      title: "Maintenance & Bad Orders",
      subtitle: "Keep Your Fleet in Service",
      desc: "Log maintenance tasks against any rolling stock type — locomotives, freight cars, passenger cars, cabooses, or MOW equipment. Bad-order a car mid-session and route it to the RIP track. Track repair history so nothing falls through the cracks.",
      details: [
        "Maintenance tasks for any asset type",
        "Mid-session bad-order workflow",
        "RIP track routing for repairs",
        "Complete repair history per unit",
      ],
    },
    {
      icon: Users,
      title: "Crew Management",
      subtitle: "Run Operations as a Team",
      desc: "Invite club members via email or shareable link. Assign roles — Dispatcher, Yardmaster, Conductor, Viewer — each with granular view/edit permissions across every module. Create custom roles when the defaults don't fit your operation.",
      details: [
        "Email invites and shareable invite links",
        "4 built-in roles with scoped permissions",
        "Custom role creation with per-module access",
        "Crew activity tracking",
      ],
    },
  ];

  const highlights = [
    {
      icon: Zap,
      title: "Cloud-Native",
      desc: "Access your railroad from any browser. No software to install, no files to sync.",
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Security",
      desc: "Granular permissions ensure crew members only see and edit what their role allows.",
    },
    {
      icon: Building2,
      title: "Multi-Railroad",
      desc: "Manage multiple railroads from a single account. Each with its own roster, locations, and crew.",
    },
    {
      icon: Rows3,
      title: "NMRA OpSIG Compatible",
      desc: "Four-panel waybill system follows established operations standards.",
    },
    {
      icon: Link2,
      title: "Import & Export",
      desc: "CSV import and export so you can migrate existing data or back up your work.",
    },
    {
      icon: BarChart3,
      title: "Session History",
      desc: "Full records of every operating session — what ran, what moved, what needs attention.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "4rem 4rem",
            }}
          />
          <div className="container relative mx-auto px-4 py-20 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 flex items-center justify-center gap-3">
                <div className="h-px flex-1 max-w-16 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Features
                </span>
                <div className="h-px flex-1 max-w-16 bg-border" />
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
                The Dispatcher&apos;s
                <br />
                <span className="text-muted-foreground">Complete Toolkit</span>
              </h1>
              <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Nine core modules that replace spreadsheets, car cards, and
                JMRI paperwork. Everything you need to run authentic operating
                sessions.
              </p>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="border-b border-border bg-muted/40 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((h) => (
                <div key={h.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary shadow-sm">
                    <h.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {h.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {h.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Module Deep Dives */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl space-y-6">
              {modules.map((mod, idx) => (
                <div
                  key={mod.title}
                  className="group rounded-lg border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground shadow-sm">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-3">
                        <mod.icon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-bold text-card-foreground">
                          {mod.title}
                        </h3>
                      </div>
                      <p className="mb-1 text-sm font-medium text-primary">
                        {mod.subtitle}
                      </p>
                      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                        {mod.desc}
                      </p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {mod.details.map((d) => (
                          <li
                            key={d}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="border-t border-border bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-12 text-center">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  How It Works
                </span>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
                  From Roster to Roll Call
                </h2>
                <p className="mx-auto max-w-xl text-muted-foreground">
                  Four steps from an empty screen to a fully dispatched
                  operating session.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    step: "01",
                    title: "Build Your Railroad",
                    desc: "Define locations, industries, and track layout. Add your locomotive roster and freight car fleet.",
                    icon: MapPin,
                  },
                  {
                    step: "02",
                    title: "Generate Waybills",
                    desc: "RailOps creates four-panel waybills that route cars between industries based on commodity demand.",
                    icon: FileText,
                  },
                  {
                    step: "03",
                    title: "Assemble Trains",
                    desc: "Build consists with power, cars, and caboose. Assign them to routes with scheduled stops.",
                    icon: TrainFront,
                  },
                  {
                    step: "04",
                    title: "Run Your Session",
                    desc: "Print switch lists, dispatch trains, and track car movements in real time. Debrief when the last train clears.",
                    icon: Gauge,
                  },
                ].map((s, idx, arr) => (
                  <div key={s.step}>
                    <div className="flex items-start gap-6 rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground shadow-sm">
                        {s.step}
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="mb-1 text-lg font-bold text-card-foreground">
                          {s.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {s.desc}
                        </p>
                      </div>
                      <s.icon className="mt-1 hidden h-6 w-6 shrink-0 text-muted-foreground/40 sm:block" />
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="flex justify-start pl-9">
                        <ArrowDown className="h-5 w-5 text-border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-12 text-center shadow-xl">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-card-foreground">
                All Aboard
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Spend less time on paperwork, more time running trains. Your
                first railroad is free — no credit card needed.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-10 text-base font-semibold shadow-xl"
                >
                  <Link href="/auth/signup">
                    Create Your Railroad
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 text-base font-semibold"
                >
                  <Link href="/pricing">See Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
