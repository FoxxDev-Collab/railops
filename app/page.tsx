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
  MapPin,
  ArrowRight,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";

export default async function Home() {
  const session = await auth();

  // Redirect authenticated users to their appropriate dashboard
  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-stone-100 dark:from-stone-950 dark:via-amber-950 dark:to-stone-900">
      {/* Header */}
      <LandingHeader />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-900/20 bg-amber-900/5 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-100/20 dark:bg-amber-100/5 dark:text-amber-100">
                <Gauge className="h-4 w-4" />
                <span>Modern Tools for Classic Railroading</span>
              </div>
              <h1 className="mb-6 bg-gradient-to-br from-amber-900 via-orange-900 to-amber-800 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent dark:from-amber-100 dark:via-orange-200 dark:to-amber-300 sm:text-7xl">
                Model Railroad
                <br />
                Operations Management
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-amber-900/70 dark:text-amber-100/70">
                Step back into the golden age of railroading. Manage your model
                railroad with the precision of a master dispatcher. From layouts
                to waybills, from rolling stock to route planning.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="h-14 bg-gradient-to-r from-amber-700 to-orange-800 px-8 text-lg font-semibold text-amber-50 shadow-xl hover:from-amber-800 hover:to-orange-900"
                >
                  <Link href="/auth/signup">
                    Begin Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 border-2 border-amber-900/20 px-8 text-lg font-semibold text-amber-900 hover:bg-amber-900/10 dark:border-amber-100/20 dark:text-amber-100 dark:hover:bg-amber-100/10"
                >
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-amber-900 dark:text-amber-100">
                  500+
                </div>
                <div className="text-sm font-medium uppercase tracking-wider text-amber-800/60 dark:text-amber-200/60">
                  Active Operators
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-amber-900 dark:text-amber-100">
                  1,200+
                </div>
                <div className="text-sm font-medium uppercase tracking-wider text-amber-800/60 dark:text-amber-200/60">
                  Layouts Managed
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-amber-900 dark:text-amber-100">
                  10K+
                </div>
                <div className="text-sm font-medium uppercase tracking-wider text-amber-800/60 dark:text-amber-200/60">
                  Rolling Stock Tracked
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-y border-amber-900/20 bg-gradient-to-br from-amber-900/5 via-orange-900/5 to-stone-900/5 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                  The Dispatcher's Toolkit
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-amber-900/70 dark:text-amber-100/70">
                  Everything you need to run authentic operating sessions like
                  the prototype railroads of yesteryear.
                </p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="group rounded-xl border-2 border-amber-900/10 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-amber-950 dark:to-orange-950">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                    <LayoutGrid className="h-8 w-8 text-amber-50" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    Layout Planning
                  </h3>
                  <p className="text-amber-900/70 dark:text-amber-100/70">
                    Map your empire with precision. Track stations, industries,
                    and sidings across your entire railroad division.
                  </p>
                </div>

                <div className="group rounded-xl border-2 border-amber-900/10 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-amber-950 dark:to-orange-950">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                    <Train className="h-8 w-8 text-amber-50" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    Rolling Stock Registry
                  </h3>
                  <p className="text-amber-900/70 dark:text-amber-100/70">
                    Catalog every boxcar, hopper, and gondola. Track reporting
                    marks, car types, and maintenance records.
                  </p>
                </div>

                <div className="group rounded-xl border-2 border-amber-900/10 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-amber-950 dark:to-orange-950">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                    <FileText className="h-8 w-8 text-amber-50" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    Waybill Generation
                  </h3>
                  <p className="text-amber-900/70 dark:text-amber-100/70">
                    Create authentic car cards and waybills for realistic
                    freight operations, just like the prototype.
                  </p>
                </div>

                <div className="group rounded-xl border-2 border-amber-900/10 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-amber-950 dark:to-orange-950">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                    <RouteIcon className="h-8 w-8 text-amber-50" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    Train Orders
                  </h3>
                  <p className="text-amber-900/70 dark:text-amber-100/70">
                    Build switching lists and train consists. Optimize routes
                    for maximum efficiency across your division.
                  </p>
                </div>

                <div className="group rounded-xl border-2 border-amber-900/10 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-amber-950 dark:to-orange-950">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                    <Clock className="h-8 w-8 text-amber-50" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    Session Logs
                  </h3>
                  <p className="text-amber-900/70 dark:text-amber-100/70">
                    Record operating sessions with detailed logs. Track
                    performance and improve your railroad operations.
                  </p>
                </div>

                <div className="group rounded-xl border-2 border-amber-900/10 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-amber-950 dark:to-orange-950">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                    <Printer className="h-8 w-8 text-amber-50" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    Paperwork Bureau
                  </h3>
                  <p className="text-amber-900/70 dark:text-amber-100/70">
                    Print manifests, switch lists, and train orders. Generate
                    all the paperwork your crew needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-2xl border-2 border-amber-900/20 bg-gradient-to-br from-amber-900/10 via-orange-900/10 to-stone-900/10 p-12 text-center shadow-2xl">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-orange-800 shadow-lg">
                <Train className="h-10 w-10 text-amber-50" />
              </div>
              <h2 className="mb-4 text-4xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                All Aboard!
              </h2>
              <p className="mb-8 text-xl text-amber-900/70 dark:text-amber-100/70">
                Join hundreds of model railroaders running realistic operations
                with RailOps. Your journey begins at the depot.
              </p>
              <Button
                size="lg"
                asChild
                className="h-14 bg-gradient-to-r from-amber-700 to-orange-800 px-10 text-lg font-semibold text-amber-50 shadow-xl hover:from-amber-800 hover:to-orange-900"
              >
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
      <footer className="border-t border-amber-900/20 bg-gradient-to-r from-amber-900/5 to-orange-900/5 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-800 to-orange-900">
                <Train className="h-4 w-4 text-amber-100" />
              </div>
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                RailOps
              </span>
            </div>
            <div className="text-sm text-amber-900/60 dark:text-amber-100/60">
              © {new Date().getFullYear()} RailOps. Keeping the rails running
              since 2024.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
