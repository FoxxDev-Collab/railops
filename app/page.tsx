import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutGrid,
  Train,
  FileText,
  Route as RouteIcon,
  Clock,
  Printer,
  Gauge,
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground">
                <Gauge className="h-4 w-4" />
                <span>Modern Tools for Classic Railroading</span>
              </div>
              <h1 className="mb-6 text-6xl font-extrabold tracking-tight text-foreground sm:text-7xl">
                Model Railroad
                <br />
                Operations Management
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-muted-foreground">
                Step back into the golden age of railroading. Manage your model
                railroad with the precision of a master dispatcher. From layouts
                to waybills, from rolling stock to route planning.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild className="h-14 px-8 text-lg font-semibold shadow-xl">
                  <Link href="/auth/signup">
                    Begin Your Journey
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

            {/* Stats */}
            <div className="mt-20 grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-foreground">500+</div>
                <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Active Operators
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-foreground">1,200+</div>
                <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Layouts Managed
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-foreground">10K+</div>
                <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Rolling Stock Tracked
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                  The Dispatcher&apos;s Toolkit
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  Everything you need to run authentic operating sessions like
                  the prototype railroads of yesteryear.
                </p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: LayoutGrid,
                    title: "Layout Planning",
                    desc: "Map your empire with precision. Track stations, industries, and sidings across your entire railroad division.",
                  },
                  {
                    icon: Train,
                    title: "Rolling Stock Registry",
                    desc: "Catalog every boxcar, hopper, and gondola. Track reporting marks, car types, and maintenance records.",
                  },
                  {
                    icon: FileText,
                    title: "Waybill Generation",
                    desc: "Create authentic car cards and waybills for realistic freight operations, just like the prototype.",
                  },
                  {
                    icon: RouteIcon,
                    title: "Train Orders",
                    desc: "Build switching lists and train consists. Optimize routes for maximum efficiency across your division.",
                  },
                  {
                    icon: Clock,
                    title: "Session Logs",
                    desc: "Record operating sessions with detailed logs. Track performance and improve your railroad operations.",
                  },
                  {
                    icon: Printer,
                    title: "Paperwork Bureau",
                    desc: "Print manifests, switch lists, and train orders. Generate all the paperwork your crew needs.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-lg"
                  >
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-md">
                      <feature.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-card-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-12 text-center shadow-xl">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg">
                <Train className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="mb-4 text-4xl font-bold tracking-tight text-card-foreground">
                All Aboard!
              </h2>
              <p className="mb-8 text-xl text-muted-foreground">
                Join hundreds of model railroaders running realistic operations
                with RailOps. Your journey begins at the depot.
              </p>
              <Button size="lg" asChild className="h-14 px-10 text-lg font-semibold shadow-xl">
                <Link href="/auth/signup">
                  Start Your Free Trial
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
              &copy; {new Date().getFullYear()} RailOps. Keeping the rails running
              since 2024.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
