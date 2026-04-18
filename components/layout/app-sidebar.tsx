"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  MapPin,
  Train,
  TrainFront,
  Route,
  FileText,
  PlayCircle,
  Settings,
  LogOut,
  Users,
  ArrowLeftRight,
  Armchair,
  Container,
  Wrench,
  ShieldCheck,
  CreditCard,
  BookOpen,
  ArrowUpDown,
  BarChart3,
  Activity,
  HeartPulse,
  AlertCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useLayout } from "@/components/layouts/layout-context";

interface AppSidebarProps {
  variant?: "user" | "admin";
}

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/analytics", label: "Growth", icon: BarChart3 },
  { href: "/admin/analytics/cohorts", label: "Cohorts", icon: Activity },
  { href: "/admin/analytics/usage", label: "Usage", icon: Activity },
  { href: "/admin/analytics/revenue", label: "Revenue", icon: CreditCard },
  { href: "/admin/health", label: "System Health", icon: HeartPulse },
  { href: "/admin/health/errors", label: "Error Log", icon: AlertCircle },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck },
  { href: "/admin/system", label: "System Settings", icon: Settings },
];

function getRailroadMenuItems(railroadId: string) {
  return [
    {
      href: `/dashboard/railroad/${railroadId}`,
      label: "Operations Center",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `/dashboard/railroad/${railroadId}/locations`,
      label: "Locations",
      icon: MapPin,
    },
    {
      href: `/dashboard/railroad/${railroadId}/locomotives`,
      label: "Locomotives",
      icon: TrainFront,
    },
    {
      href: `/dashboard/railroad/${railroadId}/rolling-stock`,
      label: "Freight Cars",
      icon: Train,
    },
    {
      href: `/dashboard/railroad/${railroadId}/passenger-cars`,
      label: "Passenger Cars",
      icon: Armchair,
    },
    {
      href: `/dashboard/railroad/${railroadId}/cabooses`,
      label: "Cabooses",
      icon: Container,
    },
    {
      href: `/dashboard/railroad/${railroadId}/mow-equipment`,
      label: "MOW Equipment",
      icon: Wrench,
    },
    {
      href: `/dashboard/railroad/${railroadId}/trains`,
      label: "Trains",
      icon: Route,
    },
    {
      href: `/dashboard/railroad/${railroadId}/waybills`,
      label: "Waybills",
      icon: FileText,
    },
    {
      href: `/dashboard/railroad/${railroadId}/sessions`,
      label: "Sessions",
      icon: PlayCircle,
    },
    {
      href: `/dashboard/railroad/${railroadId}/crew`,
      label: "Crew",
      icon: Users,
    },
    {
      href: `/dashboard/railroad/${railroadId}/import-export`,
      label: "Import / Export",
      icon: ArrowUpDown,
    },
    {
      href: `/dashboard/railroad/${railroadId}/guide`,
      label: "Operations Guide",
      icon: BookOpen,
    },
    {
      href: `/dashboard/railroad/${railroadId}/settings`,
      label: "Settings",
      icon: Settings,
    },
  ];
}

export function AppSidebar({ variant = "user" }: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedLayout } = useLayout();

  // Detect if we're inside a railroad context
  const railroadMatch = pathname.match(/\/dashboard\/railroad\/([^/]+)/);
  const railroadId = railroadMatch?.[1];
  const isInRailroad = railroadId && railroadId !== "new";

  const menuItems = variant === "admin"
    ? adminMenuItems
    : isInRailroad
      ? getRailroadMenuItems(railroadId)
      : [];

  async function handleSignOut() {
    if (variant === "admin") {
      const { adminLogout } = await import("@/app/actions/admin/auth");
      await adminLogout();
    } else {
      const { signOut } = await import("next-auth/react");
      signOut({ callbackUrl: "/auth/login" });
    }
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Image
              src="/railroadops-logo.png"
              alt="Railroad Ops"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <div>
              <h2 className="font-display text-base font-bold leading-tight">Railroad Ops</h2>
              {variant === "admin" && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Admin Panel</p>
              )}
            </div>
          </Link>
        </div>
        {isInRailroad && selectedLayout && (
          <>
            <SidebarSeparator />
            <div className="px-4 py-2">
              <p className="text-sm font-medium">{selectedLayout.name}</p>
              {selectedLayout.scale && (
                <p className="text-xs text-muted-foreground">
                  {selectedLayout.scale} Scale
                </p>
              )}
            </div>
            <SidebarSeparator />
          </>
        )}
      </SidebarHeader>
      <SidebarContent>
        {isInRailroad && (
          <div className="px-2 pt-2">
            <SidebarMenuButton asChild>
              <Link
                href="/dashboard"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Switch Railroad</span>
              </Link>
            </SidebarMenuButton>
          </div>
        )}
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href, (item as { exact?: boolean }).exact)}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-1 px-2">
          <Button variant="ghost" className="justify-start" asChild>
            <Link href="/dashboard/account">
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="flex-1 justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
