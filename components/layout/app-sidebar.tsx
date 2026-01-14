"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Map,
  Building,
  Train,
  Route,
  LogOut,
  Users,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface AppSidebarProps {
  variant?: "user" | "admin";
}

const userMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/layouts", label: "Layouts", icon: Map },
  { href: "/dashboard/stations", label: "Stations", icon: Building },
  { href: "/dashboard/rolling-stock", label: "Rolling Stock", icon: Train },
  { href: "/dashboard/routes", label: "Routes", icon: Route },
];

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/system", label: "System Settings", icon: Settings },
];

export function AppSidebar({ variant = "user" }: AppSidebarProps) {
  const pathname = usePathname();
  const menuItems = variant === "admin" ? adminMenuItems : userMenuItems;

  async function handleSignOut() {
    // Use next-auth signOut
    const { signOut } = await import("next-auth/react");
    signOut({ callbackUrl: "/auth/login" });
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold">RailOps</h2>
          {variant === "admin" && (
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
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
        <div className="flex items-center gap-2 px-2">
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
      </SidebarFooter>
    </Sidebar>
  );
}
