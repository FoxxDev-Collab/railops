import Link from "next/link";
import { Train } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Train className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">RailOps</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </nav>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RailOps. Keeping the rails
            running since 2024.
          </div>
        </div>
      </div>
    </footer>
  );
}
