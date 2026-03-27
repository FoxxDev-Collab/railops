"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canExport } from "@/lib/limits";
import { parseCSV } from "@/lib/csv/parse";
import { validateRows, type ValidatedRow } from "@/lib/csv/validate";
import type { ResourceType } from "@/lib/csv/columns";
import { revalidatePath } from "next/cache";

async function requireImportAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await canExport(session.user.id);
  if (!allowed) throw new Error("Import requires Operator plan or higher");
  return session;
}

export interface PreviewResult {
  headers: string[];
  validRows: ValidatedRow[];
  invalidRows: ValidatedRow[];
  totalRows: number;
}

export async function previewImport(
  type: ResourceType,
  csvContent: string
): Promise<PreviewResult> {
  await requireImportAuth();
  const parsed = parseCSV(csvContent);
  const validated = validateRows(type, parsed.rows);
  return {
    headers: parsed.headers,
    validRows: validated.filter((r) => r.valid),
    invalidRows: validated.filter((r) => !r.valid),
    totalRows: parsed.rows.length,
  };
}

export async function confirmImport(
  layoutId: string,
  type: ResourceType,
  csvContent: string
): Promise<{ created: number; errors: string[] }> {
  const session = await requireImportAuth();
  const userId = session.user.id;

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId },
    include: { locations: { select: { id: true, name: true } } },
  });
  if (!layout) throw new Error("Layout not found");

  const parsed = parseCSV(csvContent);
  const validated = validateRows(type, parsed.rows);
  const validRows = validated.filter((r) => r.valid);

  const locationLookup = new Map(
    layout.locations.map((l) => [l.name.toLowerCase(), l.id])
  );

  function resolveLocationId(name: unknown): string | undefined {
    if (typeof name !== "string" || !name) return undefined;
    return locationLookup.get(name.toLowerCase());
  }

  let created = 0;
  const errors: string[] = [];

  for (const row of validRows) {
    try {
      await createRecord(type, row.data, layoutId, userId, resolveLocationId);
      created++;
    } catch (e) {
      errors.push(`Row ${row.rowIndex + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { created, errors };
}

async function createRecord(
  type: ResourceType,
  data: Record<string, unknown>,
  layoutId: string,
  userId: string,
  resolveLocationId: (name: unknown) => string | undefined
) {
  switch (type) {
    case "locations":
      await db.location.create({
        data: {
          name: data.name as string,
          code: data.code as string,
          locationType: data.locationType as any,
          description: (data.description as string) || null,
          layoutId,
          userId,
        },
      });
      break;

    case "industries": {
      const locationId = resolveLocationId(data.locationName);
      if (!locationId) throw new Error(`Location "${data.locationName}" not found`);
      await db.industry.create({
        data: {
          name: data.name as string,
          type: data.type as string,
          locationId,
          capacity: (data.capacity as number) ?? null,
          spotCount: (data.spotCount as number) ?? null,
          trackLength: (data.trackLength as number) ?? null,
          description: (data.description as string) || null,
          commoditiesIn: (data.commoditiesIn as string[]) ?? [],
          commoditiesOut: (data.commoditiesOut as string[]) ?? [],
          userId,
        },
      });
      break;
    }

    case "locomotives":
      await db.locomotive.create({
        data: {
          road: data.road as string,
          number: data.number as string,
          model: data.model as string,
          locomotiveType: data.locomotiveType as any,
          serviceType: (data.serviceType as any) ?? "ROAD_FREIGHT",
          horsepower: (data.horsepower as number) ?? null,
          status: (data.status as any) ?? "SERVICEABLE",
          dccAddress: (data.dccAddress as number) ?? null,
          decoderManufacturer: (data.decoderManufacturer as string) || null,
          decoderModel: (data.decoderModel as string) || null,
          hasSound: (data.hasSound as boolean) ?? false,
          length: (data.length as number) ?? null,
          currentLocationId: resolveLocationId(data.currentLocation),
          layoutId,
          userId,
        },
      });
      break;

    case "freightCars":
      await db.freightCar.create({
        data: {
          reportingMarks: data.reportingMarks as string,
          number: data.number as string,
          carType: data.carType as string,
          aarTypeCode: (data.aarTypeCode as string) || null,
          subtype: (data.subtype as string) || null,
          length: (data.length as number) ?? null,
          capacity: (data.capacity as number) ?? null,
          homeRoad: (data.homeRoad as string) || null,
          status: (data.status as any) ?? "SERVICEABLE",
          commodities: (data.commodities as string[]) ?? [],
          currentLocationId: resolveLocationId(data.currentLocation),
          layoutId,
          userId,
        },
      });
      break;

    case "passengerCars":
      await db.passengerCar.create({
        data: {
          reportingMarks: data.reportingMarks as string,
          number: data.number as string,
          carName: (data.carName as string) || null,
          carType: data.carType as any,
          classOfService: (data.classOfService as any) ?? "COACH",
          seats: (data.seats as number) ?? null,
          berths: (data.berths as number) ?? null,
          length: (data.length as number) ?? null,
          status: (data.status as any) ?? "SERVICEABLE",
          currentLocationId: resolveLocationId(data.currentLocation),
          layoutId,
          userId,
        },
      });
      break;

    case "cabooses":
      await db.caboose.create({
        data: {
          reportingMarks: data.reportingMarks as string,
          number: data.number as string,
          cabooseType: (data.cabooseType as any) ?? "STANDARD",
          road: (data.road as string) || null,
          length: (data.length as number) ?? null,
          status: (data.status as any) ?? "SERVICEABLE",
          currentLocationId: resolveLocationId(data.currentLocation),
          layoutId,
          userId,
        },
      });
      break;

    case "mowEquipment":
      await db.mOWEquipment.create({
        data: {
          reportingMarks: data.reportingMarks as string,
          number: data.number as string,
          equipmentType: data.equipmentType as any,
          description: (data.description as string) || null,
          length: (data.length as number) ?? null,
          status: (data.status as any) ?? "SERVICEABLE",
          currentLocationId: resolveLocationId(data.currentLocation),
          layoutId,
          userId,
        },
      });
      break;

    case "trains": {
      const originId = resolveLocationId(data.origin);
      const destinationId = resolveLocationId(data.destination);
      await db.train.create({
        data: {
          trainNumber: data.trainNumber as string,
          trainName: (data.trainName as string) || null,
          trainClass: (data.trainClass as any) ?? "MANIFEST",
          serviceType: (data.serviceType as any) ?? "FREIGHT",
          departureTime: (data.departureTime as string) || null,
          symbol: (data.symbol as string) || null,
          description: (data.description as string) || null,
          originId: originId ?? null,
          destinationId: destinationId ?? null,
          layoutId,
          userId,
        },
      });
      break;
    }
  }
}
