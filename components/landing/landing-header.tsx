"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Train } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function LandingHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-lg">
            <Train className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-foreground">
              RailOps
            </span>
            <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Est. 2024
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
