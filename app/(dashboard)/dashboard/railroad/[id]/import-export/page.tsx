import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { canExport } from "@/lib/limits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { ExportPanel } from "@/components/import-export/export-panel";
import { ImportPanel } from "@/components/import-export/import-panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import / Export",
};

export default async function ImportExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);
  const hasAccess = await canExport(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Import / Export
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            {layout.name} — Bulk data operations
          </p>
        </div>
      </div>

      {hasAccess ? (
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
          <TabsContent value="export">
            <ExportPanel layoutId={id} />
          </TabsContent>
          <TabsContent value="import">
            <ImportPanel layoutId={id} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">
              Upgrade to Import &amp; Export
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              CSV import and export is available on the Operator plan and above.
              Upgrade to bulk-manage your railroad data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
