import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">RailOps</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Model Railroad Operations Management
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Streamline your model railroad operations with RailOps. Manage
              layouts, track rolling stock, create waybills, and run realistic
              operating sessions with ease.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-center text-3xl font-bold tracking-tight">
                Everything You Need for Realistic Operations
              </h2>
              <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-card p-6">
                  <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10" />
                  <h3 className="text-xl font-semibold">Layout Management</h3>
                  <p className="mt-2 text-muted-foreground">
                    Design and manage your railroad layouts with stations,
                    industries, and track information.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10" />
                  <h3 className="text-xl font-semibold">Rolling Stock</h3>
                  <p className="mt-2 text-muted-foreground">
                    Track your entire fleet of freight cars and locomotives
                    with detailed specifications.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10" />
                  <h3 className="text-xl font-semibold">Waybill System</h3>
                  <p className="mt-2 text-muted-foreground">
                    Generate realistic waybills and car cards for authentic
                    operating sessions.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10" />
                  <h3 className="text-xl font-semibold">Route Builder</h3>
                  <p className="mt-2 text-muted-foreground">
                    Create train routes with multiple stops and optimize
                    switching operations.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10" />
                  <h3 className="text-xl font-semibold">Session Tracking</h3>
                  <p className="mt-2 text-muted-foreground">
                    Record and track operating sessions with detailed logs and
                    statistics.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10" />
                  <h3 className="text-xl font-semibold">Print & Export</h3>
                  <p className="mt-2 text-muted-foreground">
                    Generate professional manifests and export data for your
                    operating crew.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to Improve Your Operations?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join model railroaders using RailOps to manage their layouts
                and run realistic operating sessions.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/auth/signup">Create Your Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RailOps. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
