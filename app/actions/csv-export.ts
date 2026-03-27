"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canExport } from "@/lib/limits";
import { toCSV } from "@/lib/csv/export";
import {
  locationColumns,
  industryColumns,
  locomotiveColumns,
  freightCarColumns,
  passengerCarColumns,
  cabooseColumns,
  mowColumns,
  trainColumns,
  type ResourceType,
} from "@/lib/csv/columns";

async function requireExportAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await canExport(session.user.id);
  if (!allowed) throw new Error("Export requires Operator plan or higher");
  return session;
}

export async function exportLocations(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.location.findMany({
    where: { layoutId, userId: session.user.id },
    orderBy: { sortOrder: "asc" },
  });
  return toCSV(data, locationColumns);
}

export async function exportIndustries(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.industry.findMany({
    where: { userId: session.user.id, location: { layoutId } },
    include: { location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    locationName: d.location.name,
  }));
  return toCSV(rows, industryColumns);
}

export async function exportLocomotives(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.locomotive.findMany({
    where: { layoutId, userId: session.user.id },
    include: { currentLocation: { select: { name: true } } },
    orderBy: { road: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    currentLocation: d.currentLocation?.name ?? null,
  }));
  return toCSV(rows, locomotiveColumns);
}

export async function exportFreightCars(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.freightCar.findMany({
    where: { layoutId, userId: session.user.id },
    include: { currentLocation: { select: { name: true } } },
    orderBy: { reportingMarks: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    currentLocation: d.currentLocation?.name ?? null,
  }));
  return toCSV(rows, freightCarColumns);
}

export async function exportPassengerCars(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.passengerCar.findMany({
    where: { layoutId, userId: session.user.id },
    include: { currentLocation: { select: { name: true } } },
    orderBy: { reportingMarks: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    currentLocation: d.currentLocation?.name ?? null,
  }));
  return toCSV(rows, passengerCarColumns);
}

export async function exportCabooses(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.caboose.findMany({
    where: { layoutId, userId: session.user.id },
    include: { currentLocation: { select: { name: true } } },
    orderBy: { reportingMarks: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    currentLocation: d.currentLocation?.name ?? null,
  }));
  return toCSV(rows, cabooseColumns);
}

export async function exportMOWEquipment(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.mOWEquipment.findMany({
    where: { layoutId, userId: session.user.id },
    include: { currentLocation: { select: { name: true } } },
    orderBy: { reportingMarks: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    currentLocation: d.currentLocation?.name ?? null,
  }));
  return toCSV(rows, mowColumns);
}

export async function exportTrains(layoutId: string) {
  const session = await requireExportAuth();
  const data = await db.train.findMany({
    where: { layoutId, userId: session.user.id },
    include: {
      origin: { select: { name: true } },
      destination: { select: { name: true } },
    },
    orderBy: { trainNumber: "asc" },
  });
  const rows = data.map((d) => ({
    ...d,
    origin: d.origin?.name ?? null,
    destination: d.destination?.name ?? null,
  }));
  return toCSV(rows, trainColumns);
}

export async function exportResource(layoutId: string, type: ResourceType) {
  const exporters: Record<ResourceType, (id: string) => Promise<string>> = {
    locations: exportLocations,
    industries: exportIndustries,
    locomotives: exportLocomotives,
    freightCars: exportFreightCars,
    passengerCars: exportPassengerCars,
    cabooses: exportCabooses,
    mowEquipment: exportMOWEquipment,
    trains: exportTrains,
  };
  return exporters[type](layoutId);
}
