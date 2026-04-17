import Link from "next/link";
import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <Image
              src="/railroadops-logo.png"
              alt="Railroad Ops"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="font-display font-semibold text-foreground">
              Railroad Ops
            </span>
          </Link>
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
            &copy; {new Date().getFullYear()} Railroad Ops. Keeping the
            rails running since 2024.
          </div>
        </div>
      </div>
    </footer>
  );
}
