"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function LandingHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image
            src="/railroadops-logo.png"
            alt="Railroad Ops"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          <div>
            <span className="block font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Railroad Ops
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              railroadops.com
            </span>
          </div>
        </Link>
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
              <Link href="/auth/signup">Start Free</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
