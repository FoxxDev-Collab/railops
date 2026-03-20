import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LayoutProvider } from "@/components/layouts/layout-context";
import { getLayoutContext } from "@/app/actions/layouts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedLayout, layouts } = await getLayoutContext();

  return (
    <SidebarProvider>
      <LayoutProvider initialLayout={selectedLayout} layouts={layouts}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </LayoutProvider>
    </SidebarProvider>
  );
}
