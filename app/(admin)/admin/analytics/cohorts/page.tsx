import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getCohortRetention } from "@/app/actions/admin/analytics";
import { CohortGrid } from "@/components/admin/analytics/cohort-grid";

export default async function CohortsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const cohortData = await getCohortRetention(6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cohort Analysis</h1>
        <p className="text-sm text-muted-foreground">
          User retention and conversion by signup month
        </p>
      </div>

      <CohortGrid initialData={cohortData} />
    </div>
  );
}
