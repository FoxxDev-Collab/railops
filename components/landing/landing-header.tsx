"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Train } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function LandingHeader() {
  return (
    <header className="border-b border-amber-900/20 bg-gradient-to-r from-amber-900/10 to-orange-900/10 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-600 to-orange-700 opacity-20 blur" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-800 to-orange-900 shadow-lg">
              <Train className="h-6 w-6 text-amber-100" />
            </div>
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
              RailOps
            </span>
            <span className="block text-xs font-medium uppercase tracking-wider text-amber-800/60 dark:text-amber-200/60">
              Est. 2024
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            asChild
            className="text-amber-900 hover:bg-amber-900/10 hover:text-amber-950 dark:text-amber-100 dark:hover:bg-amber-100/10"
          >
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 shadow-lg hover:from-amber-800 hover:to-orange-900"
          >
            <Link href="/auth/signup">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
