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
} from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

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

  const freeFeatures = [
    "1 railroad",
    "25 locations",
    "25 locomotives",
    "25 freight cars",
    "25 trains",
    "Waybill generation",
    "Operating sessions",
    "Maintenance tracking",
  ];

  const operatorFeatures = [
    "Everything in Free",
    "Unlimited railroads",
    "Unlimited inventory",
    "Unlimited trains & waybills",
    "Print switch lists & manifests",
    "CSV import / export",
    "Priority support",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
              Run Your Railroad
              <br />
              <span className="text-muted-foreground">Like the Prototype</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-muted-foreground">
              RailOps replaces spreadsheets, car cards, and JMRI paperwork with
              a cloud platform built for model railroad operations. Inventory
              your equipment, generate waybills, build consists, and run
              sessions — all from your browser.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="h-14 px-8 text-lg font-semibold shadow-xl"
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
                className="h-14 px-8 text-lg font-semibold"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                  The Dispatcher&apos;s Toolkit
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  Everything you need to run authentic operating sessions.
                  Built by railroaders, for railroaders.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-sm">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-card-foreground">
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

        {/* Pricing */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                  Simple, Honest Pricing
                </h2>
                <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                  Start free, upgrade when you need more. No tricks, no
                  annual commitments, cancel anytime.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                {/* Free */}
                <Card className="relative">
                  <CardHeader>
                    <CardTitle className="text-2xl">Hobbyist</CardTitle>
                    <CardDescription>
                      Perfect for getting started with a single railroad
                    </CardDescription>
                    <div className="pt-2">
                      <span className="text-4xl font-extrabold text-foreground">
                        $0
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {freeFeatures.map((f) => (
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

                {/* Operator */}
                <Card className="relative border-primary">
                  <div className="absolute -top-3 left-6">
                    <Badge className="px-3 py-1 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">Operator</CardTitle>
                    <CardDescription>
                      Unlimited everything for serious railroaders
                    </CardDescription>
                    <div className="pt-2">
                      <span className="text-4xl font-extrabold text-foreground">
                        $5
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {operatorFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
                      <p className="text-sm font-medium text-foreground">
                        Crew Add-on
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Invite club members at{" "}
                        <span className="font-semibold text-foreground">
                          $5/month per crew member
                        </span>
                        . Each gets their own login with role-based access.
                      </p>
                    </div>
                    <Button asChild className="mt-6 w-full" size="lg">
                      <Link href="/auth/signup">Start Free, Upgrade Later</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Running a club?{" "}
                <span className="font-medium text-foreground">
                  A 5-person club pays $25/mo total
                </span>{" "}
                ($5 operator + 4 crew at $5 each) — less than a box of
                Kadee couplers.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-12 text-center shadow-xl">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg">
                <Train className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="mb-4 text-4xl font-bold tracking-tight text-card-foreground">
                All Aboard!
              </h2>
              <p className="mb-8 text-xl text-muted-foreground">
                Spend less time on paperwork, more time running trains. Your
                first railroad is free — no credit card needed.
              </p>
              <Button
                size="lg"
                asChild
                className="h-14 px-10 text-lg font-semibold shadow-xl"
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

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Train className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">RailOps</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} RailOps. Keeping the rails
              running since 2024.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
