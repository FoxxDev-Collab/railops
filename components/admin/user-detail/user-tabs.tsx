"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface UserTabsProps {
  overview: ReactNode;
  activity: ReactNode;
  railroads: ReactNode;
  actions: ReactNode;
  billing: ReactNode;
  notes: ReactNode;
}

export function UserTabs({ overview, activity, railroads, actions, billing, notes }: UserTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="railroads">Railroads</TabsTrigger>
        <TabsTrigger value="actions">Admin Actions</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
      <TabsContent value="railroads">{railroads}</TabsContent>
      <TabsContent value="actions">{actions}</TabsContent>
      <TabsContent value="billing">{billing}</TabsContent>
      <TabsContent value="notes">{notes}</TabsContent>
    </Tabs>
  );
}
