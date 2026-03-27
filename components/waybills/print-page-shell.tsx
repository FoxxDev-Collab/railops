"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface PrintPageShellProps {
  title: string;
  backUrl: string;
  children: React.ReactNode;
}

export function PrintPageShell({
  title,
  backUrl,
  children,
}: PrintPageShellProps) {
  return (
    <div>
      <div className="print:hidden mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
      <div className="print:m-0 print:p-0">{children}</div>
    </div>
  );
}
