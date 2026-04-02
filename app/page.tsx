import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  Check,
  ArrowRight,
  ArrowDown,
  Gauge,
} from "lucide-react";
import Image from "next/image";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getPricingConfig } from "@/app/actions/admin/pricing";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  const pricing = await getPricingConfig();

  const features = [
    {
      icon: MapPin,
      title: "Locations",
      desc: "Stations, yards, interchanges, sidings, and team tracks. Define the geography of your railroad with industries at each stop.",
    },
    {
      icon: TrainFront,
      title: "Locomotive Roster",
      desc: "Track every unit with DCC addresses, decoder details, service assignments, and maintenance history.",
    },
    {
      icon: Train,
      title: "Rolling Stock Registry",
      desc: "Catalog freight cars with AAR type codes, commodities, home roads, and current locations across your railroad.",
    },
    {
      icon: FileText,
      title: "Four-Panel Waybills",
      desc: "Authentic car card and waybill system. Cars cycle through four moves just like the NMRA OpSIG standard.",
    },
    {
      icon: RouteIcon,
      title: "Train Consists",
      desc: "Build trains with ordered consists — power, cars, and caboose. Assign to routes with stop-by-stop schedules.",
    },
    {
      icon: Printer,
      title: "Switch Lists",
      desc: "Generate printable switch lists per stop. Your crew gets exactly what they need — pickups, setouts, and track assignments.",
    },
    {
      icon: Clock,
      title: "Operating Sessions",
      desc: "Plan and run sessions with assigned trains. Track what moved, what didn't, and debrief after the last train clears.",
    },
    {
      icon: Wrench,
      title: "Maintenance & Bad Orders",
      desc: "Log maintenance on any asset. Bad-order a car mid-session and route it to the RIP track for repair.",
    },
    {
      icon: Users,
      title: "Crew Management",
      desc: "Invite your club members as crew. Assign roles — Dispatcher, Yardmaster, Conductor — each with scoped access.",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Build Your Railroad",
      desc: "Define locations, industries, and track layout. Add your locomotive roster and freight car fleet.",
      icon: MapPin,
    },
    {
      step: "02",
      title: "Generate Waybills",
      desc: "Model Rail Ops creates four-panel waybills that route cars between industries based on commodity demand.",
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
  ];

  const { free, pro } = pricing;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "4rem 4rem",
            }}
          />
          <div className="container relative mx-auto px-4 py-24 sm:py-32">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 flex items-center justify-center gap-3">
                <div className="h-px flex-1 max-w-16 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Model Railroad Operations Platform
                </span>
                <div className="h-px flex-1 max-w-16 bg-border" />
              </div>

              <h1 className="mb-8 text-center text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
                Run Your Railroad
                <br />
                <span className="text-muted-foreground">
                  Like the Prototype
                </span>
              </h1>

              <p className="mx-auto mb-12 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Model Rail Ops replaces spreadsheets, car cards, and JMRI
                paperwork with a cloud platform purpose-built for model
                railroad operations. Inventory your equipment, generate
                waybills, build consists, and run sessions — all from your
                browser.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-8 text-base font-semibold shadow-xl"
                >
                  <Link href="/auth/signup">
                    Start Free — No Card Required
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 text-base font-semibold"
                >
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>

              {/* Trust signal */}
              <p className="mt-10 text-center text-xs uppercase tracking-widest text-muted-foreground/60">
                Built by railroaders &bull; NMRA OpSIG compatible &bull; Free
                tier forever
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border bg-muted/40 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-16 text-center">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Everything You Need
                </span>
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                  The Dispatcher&apos;s Toolkit
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  Nine core modules for running authentic operating sessions.
                  Each one replaces a stack of paper or a clunky spreadsheet.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary shadow-sm">
                      <feature.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-card-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="border-b border-border py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-16 text-center">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  How It Works
                </span>
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                  From Roster to Roll Call
                </h2>
                <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                  Four steps from an empty screen to a fully dispatched
                  operating session.
                </p>
              </div>

              <div className="space-y-2">
                {workflowSteps.map((step, idx) => (
                  <div key={step.step}>
                    <div className="flex items-start gap-6 rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="flex shrink-0 flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground shadow-sm">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="mb-1 text-lg font-bold text-card-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {step.desc}
                        </p>
                      </div>
                      <step.icon className="mt-1 hidden h-6 w-6 shrink-0 text-muted-foreground/40 sm:block" />
                    </div>
                    {idx < workflowSteps.length - 1 && (
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

        {/* Pricing */}
        <section className="border-b border-border bg-muted/40 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-16 text-center">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Pricing
                </span>
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                  Simple, Honest Pricing
                </h2>
                <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                  Start free, upgrade when you outgrow the limits. No tricks, no
                  annual lock-in, cancel anytime.
                </p>
              </div>

              <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
                {/* Free */}
                <Card className="relative flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{free.name}</CardTitle>
                    <CardDescription>{free.description}</CardDescription>
                    <div className="pt-3">
                      <span className="text-4xl font-extrabold text-foreground">
                        ${free.price}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3">
                      {free.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant="outline"
                      className="mt-8 w-full"
                      size="lg"
                    >
                      <Link href="/auth/signup">Get Started Free</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Pro */}
                <Card className="relative flex flex-col border-primary shadow-lg">
                  <div className="absolute -top-3 left-6">
                    <Badge className="px-3 py-1 text-xs font-semibold">
                      Recommended
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{pro.name}</CardTitle>
                    <CardDescription>{pro.description}</CardDescription>
                    <div className="pt-3">
                      <span className="text-4xl font-extrabold text-foreground">
                        ${pro.price}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3">
                      {pro.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="mt-8 w-full" size="lg">
                      <Link href="/auth/signup">Start Free, Upgrade Later</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                All accounts start on the free tier. Upgrade or downgrade at any
                time.{" "}
                <span className="font-medium text-foreground">
                  Need more? +${pro.crewSeatPrice || "5"}/mo per additional crew seat or 5-layout pack.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-12 text-center shadow-xl">
              <div className="mb-6">
                <Image
                  src="/modelrailops-logo.png"
                  alt="Model Rail Ops"
                  width={80}
                  height={80}
                  className="mx-auto h-20 w-20 object-contain"
                />
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl">
                All Aboard
              </h2>
              <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
                Spend less time on paperwork, more time running trains. Your
                first railroad is free — no credit card needed.
              </p>
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
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
