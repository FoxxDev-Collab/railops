# Print Waybills & CSV Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add printable NMRA car card waybills (individual + batch) and a combined Import/Export page for bulk CSV operations across all resource types.

**Architecture:** Print uses Tailwind `print:` utilities with `window.print()`, matching the existing switch list pattern. CSV export builds strings server-side and triggers Blob downloads client-side. CSV import parses server-side with Zod validation, previews valid/invalid rows, and bulk-creates on confirmation. All operations use server actions (no new API routes).

**Tech Stack:** Next.js App Router, Tailwind CSS v4 `print:` variant, Prisma, Zod, server actions, shadcn/ui components

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/csv/export.ts` | Generic `toCSV()` utility and per-type export functions |
| `lib/csv/parse.ts` | Generic CSV parser (handles quoting, escaping, headers) |
| `lib/csv/validate.ts` | Per-resource-type Zod validation for import rows |
| `lib/csv/columns.ts` | Column definitions shared between import templates and export |
| `app/actions/csv-export.ts` | Server actions: one export function per resource type |
| `app/actions/csv-import.ts` | Server actions: parse/validate preview + bulk create |
| `components/waybills/waybill-print-view.tsx` | NMRA car card print layout component |
| `app/(dashboard)/dashboard/railroad/[id]/waybills/[waybillId]/print/page.tsx` | Single waybill print page |
| `app/(dashboard)/dashboard/railroad/[id]/waybills/print/page.tsx` | Batch waybill print page |
| `components/import-export/export-panel.tsx` | Export tab: resource type selection + download |
| `components/import-export/import-panel.tsx` | Import tab: upload, preview, confirm flow |
| `components/import-export/import-preview-table.tsx` | Preview table with valid/invalid row highlighting |
| `components/import-export/csv-trigger-download.ts` | Client-side Blob URL download helper |
| `app/(dashboard)/dashboard/railroad/[id]/import-export/page.tsx` | Combined import/export page |

### Modified Files

| File | Change |
|------|--------|
| `components/layout/app-sidebar.tsx` | Add "Import / Export" nav item |
| `app/(dashboard)/dashboard/railroad/[id]/waybills/page.tsx` | Add "Print All" button |
| `components/waybills/waybill-table.tsx` | Add print icon button per row |
| `components/waybills/waybill-card-list.tsx` | Add print icon button per card |

---

## Task 1: Generic CSV Export Utility

**Files:**
- Create: `lib/csv/export.ts`

- [ ] **Step 1: Create the `toCSV` utility**

```typescript
// lib/csv/export.ts

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export function toCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeField(c.header)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = col.accessor(row);
          if (val === null || val === undefined) return "";
          return escapeField(String(val));
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/csv/export.ts
git commit -m "feat: add generic CSV export utility"
```

---

## Task 2: CSV Column Definitions

**Files:**
- Create: `lib/csv/columns.ts`

- [ ] **Step 1: Define column mappings for all resource types**

```typescript
// lib/csv/columns.ts

import type { CsvColumn } from "./export";

// ── Locations ──

interface LocationRow {
  name: string;
  code: string;
  locationType: string;
  description: string | null;
}

export const locationColumns: CsvColumn<LocationRow>[] = [
  { header: "name", accessor: (r) => r.name },
  { header: "code", accessor: (r) => r.code },
  { header: "locationType", accessor: (r) => r.locationType },
  { header: "description", accessor: (r) => r.description },
];

// ── Industries ──

interface IndustryRow {
  name: string;
  type: string;
  locationName: string;
  capacity: number | null;
  spotCount: number | null;
  trackLength: number | null;
  description: string | null;
  commoditiesIn: string[];
  commoditiesOut: string[];
}

export const industryColumns: CsvColumn<IndustryRow>[] = [
  { header: "name", accessor: (r) => r.name },
  { header: "type", accessor: (r) => r.type },
  { header: "locationName", accessor: (r) => r.locationName },
  { header: "capacity", accessor: (r) => r.capacity },
  { header: "spotCount", accessor: (r) => r.spotCount },
  { header: "trackLength", accessor: (r) => r.trackLength },
  { header: "description", accessor: (r) => r.description },
  { header: "commoditiesIn", accessor: (r) => r.commoditiesIn.join("; ") },
  { header: "commoditiesOut", accessor: (r) => r.commoditiesOut.join("; ") },
];

// ── Locomotives ──

interface LocomotiveRow {
  road: string;
  number: string;
  model: string;
  locomotiveType: string;
  serviceType: string;
  horsepower: number | null;
  status: string;
  dccAddress: number | null;
  decoderManufacturer: string | null;
  decoderModel: string | null;
  hasSound: boolean;
  length: number | null;
  currentLocation: string | null;
}

export const locomotiveColumns: CsvColumn<LocomotiveRow>[] = [
  { header: "road", accessor: (r) => r.road },
  { header: "number", accessor: (r) => r.number },
  { header: "model", accessor: (r) => r.model },
  { header: "locomotiveType", accessor: (r) => r.locomotiveType },
  { header: "serviceType", accessor: (r) => r.serviceType },
  { header: "horsepower", accessor: (r) => r.horsepower },
  { header: "status", accessor: (r) => r.status },
  { header: "dccAddress", accessor: (r) => r.dccAddress },
  { header: "decoderManufacturer", accessor: (r) => r.decoderManufacturer },
  { header: "decoderModel", accessor: (r) => r.decoderModel },
  { header: "hasSound", accessor: (r) => r.hasSound },
  { header: "length", accessor: (r) => r.length },
  { header: "currentLocation", accessor: (r) => r.currentLocation },
];

// ── Freight Cars ──

interface FreightCarRow {
  reportingMarks: string;
  number: string;
  carType: string;
  aarTypeCode: string | null;
  subtype: string | null;
  length: number | null;
  capacity: number | null;
  homeRoad: string | null;
  status: string;
  commodities: string[];
  currentLocation: string | null;
}

export const freightCarColumns: CsvColumn<FreightCarRow>[] = [
  { header: "reportingMarks", accessor: (r) => r.reportingMarks },
  { header: "number", accessor: (r) => r.number },
  { header: "carType", accessor: (r) => r.carType },
  { header: "aarTypeCode", accessor: (r) => r.aarTypeCode },
  { header: "subtype", accessor: (r) => r.subtype },
  { header: "length", accessor: (r) => r.length },
  { header: "capacity", accessor: (r) => r.capacity },
  { header: "homeRoad", accessor: (r) => r.homeRoad },
  { header: "status", accessor: (r) => r.status },
  { header: "commodities", accessor: (r) => r.commodities.join("; ") },
  { header: "currentLocation", accessor: (r) => r.currentLocation },
];

// ── Passenger Cars ──

interface PassengerCarRow {
  reportingMarks: string;
  number: string;
  carName: string | null;
  carType: string;
  classOfService: string;
  seats: number | null;
  berths: number | null;
  length: number | null;
  status: string;
  currentLocation: string | null;
}

export const passengerCarColumns: CsvColumn<PassengerCarRow>[] = [
  { header: "reportingMarks", accessor: (r) => r.reportingMarks },
  { header: "number", accessor: (r) => r.number },
  { header: "carName", accessor: (r) => r.carName },
  { header: "carType", accessor: (r) => r.carType },
  { header: "classOfService", accessor: (r) => r.classOfService },
  { header: "seats", accessor: (r) => r.seats },
  { header: "berths", accessor: (r) => r.berths },
  { header: "length", accessor: (r) => r.length },
  { header: "status", accessor: (r) => r.status },
  { header: "currentLocation", accessor: (r) => r.currentLocation },
];

// ── Cabooses ──

interface CabooseRow {
  reportingMarks: string;
  number: string;
  cabooseType: string;
  road: string | null;
  length: number | null;
  status: string;
  currentLocation: string | null;
}

export const cabooseColumns: CsvColumn<CabooseRow>[] = [
  { header: "reportingMarks", accessor: (r) => r.reportingMarks },
  { header: "number", accessor: (r) => r.number },
  { header: "cabooseType", accessor: (r) => r.cabooseType },
  { header: "road", accessor: (r) => r.road },
  { header: "length", accessor: (r) => r.length },
  { header: "status", accessor: (r) => r.status },
  { header: "currentLocation", accessor: (r) => r.currentLocation },
];

// ── MOW Equipment ──

interface MOWRow {
  reportingMarks: string;
  number: string;
  equipmentType: string;
  description: string | null;
  length: number | null;
  status: string;
  currentLocation: string | null;
}

export const mowColumns: CsvColumn<MOWRow>[] = [
  { header: "reportingMarks", accessor: (r) => r.reportingMarks },
  { header: "number", accessor: (r) => r.number },
  { header: "equipmentType", accessor: (r) => r.equipmentType },
  { header: "description", accessor: (r) => r.description },
  { header: "length", accessor: (r) => r.length },
  { header: "status", accessor: (r) => r.status },
  { header: "currentLocation", accessor: (r) => r.currentLocation },
];

// ── Trains ──

interface TrainRow {
  trainNumber: string;
  trainName: string | null;
  trainClass: string;
  serviceType: string;
  departureTime: string | null;
  symbol: string | null;
  description: string | null;
  origin: string | null;
  destination: string | null;
}

export const trainColumns: CsvColumn<TrainRow>[] = [
  { header: "trainNumber", accessor: (r) => r.trainNumber },
  { header: "trainName", accessor: (r) => r.trainName },
  { header: "trainClass", accessor: (r) => r.trainClass },
  { header: "serviceType", accessor: (r) => r.serviceType },
  { header: "departureTime", accessor: (r) => r.departureTime },
  { header: "symbol", accessor: (r) => r.symbol },
  { header: "description", accessor: (r) => r.description },
  { header: "origin", accessor: (r) => r.origin },
  { header: "destination", accessor: (r) => r.destination },
];

// ── Resource type registry ──

export type ResourceType =
  | "locations"
  | "industries"
  | "locomotives"
  | "freightCars"
  | "passengerCars"
  | "cabooses"
  | "mowEquipment"
  | "trains";

export const resourceTypeLabels: Record<ResourceType, string> = {
  locations: "Locations",
  industries: "Industries",
  locomotives: "Locomotives",
  freightCars: "Freight Cars",
  passengerCars: "Passenger Cars",
  cabooses: "Cabooses",
  mowEquipment: "MOW Equipment",
  trains: "Trains",
};

export function getTemplateHeaders(type: ResourceType): string {
  const headersMap: Record<ResourceType, string[]> = {
    locations: locationColumns.map((c) => c.header),
    industries: industryColumns.map((c) => c.header),
    locomotives: locomotiveColumns.map((c) => c.header),
    freightCars: freightCarColumns.map((c) => c.header),
    passengerCars: passengerCarColumns.map((c) => c.header),
    cabooses: cabooseColumns.map((c) => c.header),
    mowEquipment: mowColumns.map((c) => c.header),
    trains: trainColumns.map((c) => c.header),
  };
  return headersMap[type].join(",") + "\n";
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/csv/columns.ts
git commit -m "feat: add CSV column definitions for all resource types"
```

---

## Task 3: CSV Export Server Actions

**Files:**
- Create: `app/actions/csv-export.ts`

- [ ] **Step 1: Create export server actions for all resource types**

```typescript
// app/actions/csv-export.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/csv-export.ts
git commit -m "feat: add CSV export server actions for all resource types"
```

---

## Task 4: CSV Parser

**Files:**
- Create: `lib/csv/parse.ts`

- [ ] **Step 1: Create the CSV parser**

```typescript
// lib/csv/parse.ts

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(input: string): ParsedCSV {
  const lines = splitLines(input.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const values = parseLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

function splitLines(input: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && input[i + 1] === "\n") i++; // skip \r\n
      lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/csv/parse.ts
git commit -m "feat: add generic CSV parser with quoted field support"
```

---

## Task 5: CSV Import Validation Schemas

**Files:**
- Create: `lib/csv/validate.ts`

- [ ] **Step 1: Create per-type Zod validation schemas for import rows**

```typescript
// lib/csv/validate.ts

import { z } from "zod";
import {
  LocationType,
  LocomotiveType,
  LocomotiveService,
  RollingStockStatus,
  PassengerCarType,
  ClassOfService,
  CabooseType,
  MOWEquipmentType,
  TrainClass,
  TrainServiceType,
} from "@prisma/client";
import type { ResourceType } from "./columns";

function enumValues<T extends Record<string, string>>(e: T) {
  return Object.values(e) as [string, ...string[]];
}

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalNumber = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  });

const optionalBoolean = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v === "") return undefined;
    return v.toLowerCase() === "true" || v === "1";
  });

const semicolonList = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v === "") return [];
    return v.split(";").map((s) => s.trim()).filter(Boolean);
  });

export const importSchemas: Record<ResourceType, z.ZodType> = {
  locations: z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Code is required"),
    locationType: z.enum(enumValues(LocationType), {
      errorMap: () => ({
        message: `Must be one of: ${enumValues(LocationType).join(", ")}`,
      }),
    }),
    description: optionalString,
  }),

  industries: z.object({
    name: z.string().min(1, "Name is required"),
    type: z.string().min(1, "Type is required"),
    locationName: z.string().min(1, "Location name is required"),
    capacity: optionalNumber,
    spotCount: optionalNumber,
    trackLength: optionalNumber,
    description: optionalString,
    commoditiesIn: semicolonList,
    commoditiesOut: semicolonList,
  }),

  locomotives: z.object({
    road: z.string().min(1, "Road is required"),
    number: z.string().min(1, "Number is required"),
    model: z.string().min(1, "Model is required"),
    locomotiveType: z.enum(enumValues(LocomotiveType), {
      errorMap: () => ({
        message: `Must be one of: ${enumValues(LocomotiveType).join(", ")}`,
      }),
    }),
    serviceType: z
      .enum(enumValues(LocomotiveService))
      .optional()
      .default("ROAD_FREIGHT"),
    horsepower: optionalNumber,
    status: z
      .enum(enumValues(RollingStockStatus))
      .optional()
      .default("SERVICEABLE"),
    dccAddress: optionalNumber,
    decoderManufacturer: optionalString,
    decoderModel: optionalString,
    hasSound: optionalBoolean,
    length: optionalNumber,
    currentLocation: optionalString,
  }),

  freightCars: z.object({
    reportingMarks: z.string().min(1, "Reporting marks required"),
    number: z.string().min(1, "Number is required"),
    carType: z.string().min(1, "Car type is required"),
    aarTypeCode: optionalString,
    subtype: optionalString,
    length: optionalNumber,
    capacity: optionalNumber,
    homeRoad: optionalString,
    status: z
      .enum(enumValues(RollingStockStatus))
      .optional()
      .default("SERVICEABLE"),
    commodities: semicolonList,
    currentLocation: optionalString,
  }),

  passengerCars: z.object({
    reportingMarks: z.string().min(1, "Reporting marks required"),
    number: z.string().min(1, "Number is required"),
    carName: optionalString,
    carType: z.enum(enumValues(PassengerCarType), {
      errorMap: () => ({
        message: `Must be one of: ${enumValues(PassengerCarType).join(", ")}`,
      }),
    }),
    classOfService: z
      .enum(enumValues(ClassOfService))
      .optional()
      .default("COACH"),
    seats: optionalNumber,
    berths: optionalNumber,
    length: optionalNumber,
    status: z
      .enum(enumValues(RollingStockStatus))
      .optional()
      .default("SERVICEABLE"),
    currentLocation: optionalString,
  }),

  cabooses: z.object({
    reportingMarks: z.string().min(1, "Reporting marks required"),
    number: z.string().min(1, "Number is required"),
    cabooseType: z
      .enum(enumValues(CabooseType))
      .optional()
      .default("STANDARD"),
    road: optionalString,
    length: optionalNumber,
    status: z
      .enum(enumValues(RollingStockStatus))
      .optional()
      .default("SERVICEABLE"),
    currentLocation: optionalString,
  }),

  mowEquipment: z.object({
    reportingMarks: z.string().min(1, "Reporting marks required"),
    number: z.string().min(1, "Number is required"),
    equipmentType: z.enum(enumValues(MOWEquipmentType), {
      errorMap: () => ({
        message: `Must be one of: ${enumValues(MOWEquipmentType).join(", ")}`,
      }),
    }),
    description: optionalString,
    length: optionalNumber,
    status: z
      .enum(enumValues(RollingStockStatus))
      .optional()
      .default("SERVICEABLE"),
    currentLocation: optionalString,
  }),

  trains: z.object({
    trainNumber: z.string().min(1, "Train number is required"),
    trainName: optionalString,
    trainClass: z
      .enum(enumValues(TrainClass))
      .optional()
      .default("MANIFEST"),
    serviceType: z
      .enum(enumValues(TrainServiceType))
      .optional()
      .default("FREIGHT"),
    departureTime: optionalString,
    symbol: optionalString,
    description: optionalString,
    origin: optionalString,
    destination: optionalString,
  }),
};

export interface ValidatedRow {
  rowIndex: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: { field: string; message: string }[];
}

export function validateRows(
  type: ResourceType,
  rows: Record<string, string>[]
): ValidatedRow[] {
  const schema = importSchemas[type];
  return rows.map((row, idx) => {
    const result = schema.safeParse(row);
    if (result.success) {
      return { rowIndex: idx, data: result.data as Record<string, unknown>, valid: true, errors: [] };
    }
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "row",
      message: issue.message,
    }));
    return { rowIndex: idx, data: row, valid: false, errors };
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/csv/validate.ts
git commit -m "feat: add CSV import validation schemas for all resource types"
```

---

## Task 6: CSV Import Server Actions

**Files:**
- Create: `app/actions/csv-import.ts`

- [ ] **Step 1: Create preview and bulk-create server actions**

```typescript
// app/actions/csv-import.ts
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
  const allowed = await canExport(session.user.id); // same tier gate as export
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

  // Build location name → id lookup for foreign key resolution
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
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/csv-import.ts
git commit -m "feat: add CSV import server actions with preview and bulk create"
```

---

## Task 7: Client-Side Download Helper

**Files:**
- Create: `components/import-export/csv-trigger-download.ts`

- [ ] **Step 1: Create the download trigger utility**

```typescript
// components/import-export/csv-trigger-download.ts

export function triggerDownload(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function makeFilename(type: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `railops-${type}-${date}.csv`;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/import-export/csv-trigger-download.ts
git commit -m "feat: add client-side CSV download trigger utility"
```

---

## Task 8: Export Panel Component

**Files:**
- Create: `components/import-export/export-panel.tsx`

- [ ] **Step 1: Create the export panel with resource type checkboxes**

This component shows all resource types as selectable cards. The user checks which ones to export, clicks Export, and each selected type downloads as a separate CSV file.

```typescript
// components/import-export/export-panel.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin,
  Building2,
  TrainFront,
  Train,
  Armchair,
  Container,
  Wrench,
  Route,
  Download,
  Loader2,
} from "lucide-react";
import { exportResource } from "@/app/actions/csv-export";
import { triggerDownload, makeFilename } from "./csv-trigger-download";
import {
  type ResourceType,
  resourceTypeLabels,
} from "@/lib/csv/columns";

const resourceIcons: Record<ResourceType, React.ElementType> = {
  locations: MapPin,
  industries: Building2,
  locomotives: TrainFront,
  freightCars: Train,
  passengerCars: Armchair,
  cabooses: Container,
  mowEquipment: Wrench,
  trains: Route,
};

const allTypes: ResourceType[] = [
  "locations",
  "industries",
  "locomotives",
  "freightCars",
  "passengerCars",
  "cabooses",
  "mowEquipment",
  "trains",
];

interface ExportPanelProps {
  layoutId: string;
}

export function ExportPanel({ layoutId }: ExportPanelProps) {
  const [selected, setSelected] = useState<Set<ResourceType>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(type: ResourceType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleExport() {
    startTransition(async () => {
      for (const type of selected) {
        try {
          const csv = await exportResource(layoutId, type);
          triggerDownload(csv, makeFilename(type));
        } catch (e) {
          // Individual export failure — continue with others
          console.error(`Export failed for ${type}:`, e);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Export Data</h3>
        <p className="text-sm text-muted-foreground">
          Select which resource types to export as CSV files.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {allTypes.map((type) => {
          const Icon = resourceIcons[type];
          const isChecked = selected.has(type);
          return (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                isChecked
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggle(type)}
              />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {resourceTypeLabels[type]}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={selected.size === 0 || isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
        {selected.size === 0 && (
          <span className="text-xs text-muted-foreground">
            Select at least one resource type
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/import-export/export-panel.tsx
git commit -m "feat: add export panel component with resource type selection"
```

---

## Task 9: Import Preview Table

**Files:**
- Create: `components/import-export/import-preview-table.tsx`

- [ ] **Step 1: Create the preview table with valid/invalid row highlighting**

```typescript
// components/import-export/import-preview-table.tsx
"use client";

import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ValidatedRow } from "@/lib/csv/validate";

interface ImportPreviewTableProps {
  headers: string[];
  validRows: ValidatedRow[];
  invalidRows: ValidatedRow[];
}

export function ImportPreviewTable({
  headers,
  validRows,
  invalidRows,
}: ImportPreviewTableProps) {
  const allRows = [...invalidRows, ...validRows].sort(
    (a, b) => a.rowIndex - b.rowIndex
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium">{validRows.length}</span>
          <span className="text-muted-foreground">valid</span>
        </div>
        {invalidRows.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="font-medium">{invalidRows.length}</span>
            <span className="text-muted-foreground">
              error{invalidRows.length !== 1 ? "s" : ""} (will be skipped)
            </span>
          </div>
        )}
      </div>

      <div className="max-h-[400px] overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-[60px]">
                Row
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-[70px]">
                Status
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {allRows.map((row) => (
              <Fragment key={row.rowIndex}>
                <tr
                  className={
                    row.valid
                      ? ""
                      : "bg-destructive/5"
                  }
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.rowIndex + 2}
                  </td>
                  <td className="px-3 py-2">
                    {row.valid ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4"
                      >
                        OK
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-destructive/50 bg-destructive/10 text-destructive text-[10px] px-1.5 py-0 h-4"
                      >
                        Error
                      </Badge>
                    )}
                  </td>
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-xs max-w-[150px] truncate">
                      {String((row.data as Record<string, unknown>)[h] ?? "")}
                    </td>
                  ))}
                </tr>
                {!row.valid && (
                  <tr className="bg-destructive/5">
                    <td
                      colSpan={headers.length + 2}
                      className="px-3 py-1 text-xs text-destructive"
                    >
                      {row.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/import-export/import-preview-table.tsx
git commit -m "feat: add import preview table with valid/invalid row highlighting"
```

---

## Task 10: Import Panel Component

**Files:**
- Create: `components/import-export/import-panel.tsx`

- [ ] **Step 1: Create the import panel with 3-step flow (select type + upload → preview → confirm)**

```typescript
// components/import-export/import-panel.tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Loader2,
  CheckCircle2,
  Download,
  AlertCircle,
} from "lucide-react";
import { previewImport, confirmImport } from "@/app/actions/csv-import";
import type { PreviewResult } from "@/app/actions/csv-import";
import { ImportPreviewTable } from "./import-preview-table";
import {
  type ResourceType,
  resourceTypeLabels,
  getTemplateHeaders,
} from "@/lib/csv/columns";
import { triggerDownload } from "./csv-trigger-download";

const allTypes: ResourceType[] = [
  "locations",
  "industries",
  "locomotives",
  "freightCars",
  "passengerCars",
  "cabooses",
  "mowEquipment",
  "trains",
];

interface ImportPanelProps {
  layoutId: string;
}

export function ImportPanel({ layoutId }: ImportPanelProps) {
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);

      if (resourceType) {
        startTransition(async () => {
          const result = await previewImport(resourceType, text);
          setPreview(result);
        });
      }
    };
    reader.readAsText(file);
  }

  function handlePreview() {
    if (!resourceType || !csvContent) return;
    startTransition(async () => {
      const result = await previewImport(resourceType, csvContent);
      setPreview(result);
    });
  }

  function handleConfirm() {
    if (!resourceType || !csvContent) return;
    startTransition(async () => {
      const result = await confirmImport(layoutId, resourceType, csvContent);
      setImportResult(result);
      setPreview(null);
    });
  }

  function handleReset() {
    setCsvContent(null);
    setFileName(null);
    setPreview(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDownloadTemplate() {
    if (!resourceType) return;
    const template = getTemplateHeaders(resourceType);
    triggerDownload(template, `railops-${resourceType}-template.csv`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Import Data</h3>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk-import records. Invalid rows will be
          highlighted and skipped.
        </p>
      </div>

      {/* Step 1: Select type */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Resource Type</label>
        <div className="flex items-center gap-3">
          <Select
            value={resourceType ?? undefined}
            onValueChange={(v) => {
              setResourceType(v as ResourceType);
              setPreview(null);
              setImportResult(null);
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {allTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {resourceTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resourceType && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download Template
            </Button>
          )}
        </div>
      </div>

      {/* Step 2: Upload file */}
      {resourceType && (
        <div className="space-y-3">
          <label className="text-sm font-medium">CSV File</label>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
              <Upload className="h-4 w-4" />
              {fileName ?? "Choose file..."}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {csvContent && !preview && (
              <Button onClick={handlePreview} disabled={isPending} size="sm">
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Preview
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {preview && (
        <div className="space-y-4">
          <ImportPreviewTable
            headers={preview.headers}
            validRows={preview.validRows}
            invalidRows={preview.invalidRows}
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isPending || preview.validRows.length === 0}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Import {preview.validRows.length} Row
              {preview.validRows.length !== 1 ? "s" : ""}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Result */}
      {importResult && (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">
                Successfully imported {importResult.created} record
                {importResult.created !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                {importResult.errors.length} error
                {importResult.errors.length !== 1 ? "s" : ""} during creation
              </div>
              <ul className="text-xs text-destructive/80 space-y-0.5">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" onClick={handleReset}>
            Import More
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/import-export/import-panel.tsx
git commit -m "feat: add import panel component with upload, preview, and confirm flow"
```

---

## Task 11: Import/Export Page

**Files:**
- Create: `app/(dashboard)/dashboard/railroad/[id]/import-export/page.tsx`
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Install shadcn tabs component**

```bash
npx shadcn@latest add tabs
```

- [ ] **Step 2: Create the combined import/export page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/import-export/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { canExport } from "@/lib/limits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, ArrowUpDown, Lock } from "lucide-react";
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
```

- [ ] **Step 3: Add sidebar nav item**

In `components/layout/app-sidebar.tsx`, add after the "Sessions" entry in `getRailroadMenuItems`:

```typescript
    {
      href: `/dashboard/railroad/${railroadId}/import-export`,
      label: "Import / Export",
      icon: ArrowUpDown,
    },
```

Also add `ArrowUpDown` to the lucide-react imports in the same file.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/railroad/[id]/import-export/page.tsx components/layout/app-sidebar.tsx components/ui/tabs.tsx
git commit -m "feat: add combined import/export page with sidebar navigation"
```

---

## Task 12: Waybill Print View Component

**Files:**
- Create: `components/waybills/waybill-print-view.tsx`

- [ ] **Step 1: Create the NMRA car card print layout**

This renders a single waybill as a 3.5" x 5" car card with 4 panels in a 2x2 grid, fold lines, and a header showing the freight car info.

```typescript
// components/waybills/waybill-print-view.tsx

interface WaybillPrintPanel {
  panelNumber: number;
  loadStatus: string;
  commodity: string | null;
  weight: number | null;
  specialInstructions: string | null;
  routeVia: string | null;
  origin?: { name: string } | null;
  destination?: { name: string } | null;
  shipperIndustry?: { name: string } | null;
  consigneeIndustry?: { name: string } | null;
}

interface WaybillPrintData {
  id: string;
  status: string;
  currentPanel: number;
  isReturnable: boolean;
  notes: string | null;
  panels: WaybillPrintPanel[];
  carCard: {
    freightCar: {
      reportingMarks: string;
      number: string;
      carType: string;
      aarTypeCode: string | null;
      homeRoad: string | null;
    };
  } | null;
}

interface WaybillPrintViewProps {
  waybill: WaybillPrintData;
}

export function WaybillPrintView({ waybill }: WaybillPrintViewProps) {
  const car = waybill.carCard?.freightCar;

  // Ensure we always have 4 panels (empty placeholders for missing ones)
  const panels: (WaybillPrintPanel | null)[] = [null, null, null, null];
  for (const p of waybill.panels) {
    panels[p.panelNumber - 1] = p;
  }

  return (
    <div
      className="mx-auto bg-white text-black"
      style={{ width: "5in", height: "3.5in" }}
    >
      {/* Card header — freight car identification */}
      <div className="flex items-end justify-between border-b-2 border-black px-3 py-1.5">
        <div>
          <p className="text-lg font-bold leading-tight tracking-wide">
            {car ? `${car.reportingMarks} ${car.number}` : "UNASSIGNED"}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-gray-600">
            {car?.aarTypeCode ? `${car.carType} (${car.aarTypeCode})` : car?.carType ?? ""}
            {car?.homeRoad ? ` — ${car.homeRoad}` : ""}
          </p>
        </div>
        <div className="text-right text-[8px] text-gray-500">
          <p>
            {waybill.isReturnable ? "RETURNABLE" : "ONE-WAY"}
          </p>
          <p>WAYBILL</p>
        </div>
      </div>

      {/* 2x2 panel grid */}
      <div className="grid grid-cols-2 grid-rows-2" style={{ height: "calc(3.5in - 38px)" }}>
        {panels.map((panel, idx) => (
          <div
            key={idx}
            className={`relative px-2.5 py-1.5 text-[9px] leading-tight ${
              idx % 2 === 0 ? "border-r border-dashed border-gray-400" : ""
            } ${idx < 2 ? "border-b border-dashed border-gray-400" : ""} ${
              idx + 1 === waybill.currentPanel
                ? "bg-gray-100"
                : ""
            }`}
          >
            {/* Panel number badge */}
            <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[7px] font-bold">
              {idx + 1}
            </div>

            {panel ? (
              <div className="space-y-0.5">
                <p className="font-bold uppercase">
                  {panel.loadStatus === "LOADED" ? "LOADED" : "EMPTY"}
                </p>
                {panel.commodity && (
                  <p>
                    <span className="text-gray-500">Commodity:</span>{" "}
                    <span className="font-medium">{panel.commodity}</span>
                    {panel.weight ? ` (${panel.weight}T)` : ""}
                  </p>
                )}
                {panel.origin && (
                  <p>
                    <span className="text-gray-500">From:</span>{" "}
                    {panel.origin.name}
                    {panel.shipperIndustry
                      ? ` — ${panel.shipperIndustry.name}`
                      : ""}
                  </p>
                )}
                {panel.destination && (
                  <p>
                    <span className="text-gray-500">To:</span>{" "}
                    {panel.destination.name}
                    {panel.consigneeIndustry
                      ? ` — ${panel.consigneeIndustry.name}`
                      : ""}
                  </p>
                )}
                {panel.routeVia && (
                  <p>
                    <span className="text-gray-500">Via:</span>{" "}
                    {panel.routeVia}
                  </p>
                )}
                {panel.specialInstructions && (
                  <p className="italic text-gray-600">
                    {panel.specialInstructions}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-300 italic">Empty</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/waybills/waybill-print-view.tsx
git commit -m "feat: add NMRA car card waybill print view component"
```

---

## Task 13: Single Waybill Print Page

**Files:**
- Create: `app/(dashboard)/dashboard/railroad/[id]/waybills/[waybillId]/print/page.tsx`

- [ ] **Step 1: Create the single waybill print page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/waybills/[waybillId]/print/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { WaybillPrintView } from "@/components/waybills/waybill-print-view";
import { PrintPageShell } from "@/components/waybills/print-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print Waybill",
};

export default async function PrintWaybillPage({
  params,
}: {
  params: Promise<{ id: string; waybillId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, waybillId } = await params;

  const waybill = await db.waybill.findFirst({
    where: { id: waybillId, userId: session.user.id },
    include: {
      panels: {
        orderBy: { panelNumber: "asc" },
        include: {
          origin: { select: { name: true } },
          destination: { select: { name: true } },
          shipperIndustry: { select: { name: true } },
          consigneeIndustry: { select: { name: true } },
        },
      },
      carCard: {
        include: {
          freightCar: {
            select: {
              reportingMarks: true,
              number: true,
              carType: true,
              aarTypeCode: true,
              homeRoad: true,
            },
          },
        },
      },
    },
  });

  if (!waybill) redirect(`/dashboard/railroad/${id}/waybills`);

  return (
    <PrintPageShell
      title="Print Waybill"
      backUrl={`/dashboard/railroad/${id}/waybills`}
    >
      <WaybillPrintView waybill={waybill} />
    </PrintPageShell>
  );
}
```

- [ ] **Step 2: Create the shared print page shell component**

This component wraps print pages with a screen-only toolbar and print-only card rendering.

```typescript
// components/waybills/print-page-shell.tsx
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
      {/* Screen-only toolbar */}
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

      {/* Print content */}
      <div className="print:m-0 print:p-0">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/railroad/[id]/waybills/[waybillId]/print/page.tsx components/waybills/print-page-shell.tsx
git commit -m "feat: add single waybill print page with car card layout"
```

---

## Task 14: Batch Waybill Print Page

**Files:**
- Create: `app/(dashboard)/dashboard/railroad/[id]/waybills/print/page.tsx`

- [ ] **Step 1: Create the batch print page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/waybills/print/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { WaybillPrintView } from "@/components/waybills/waybill-print-view";
import { PrintPageShell } from "@/components/waybills/print-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print All Waybills",
};

export default async function BatchPrintWaybillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const waybills = await db.waybill.findMany({
    where: { userId: session.user.id },
    include: {
      panels: {
        orderBy: { panelNumber: "asc" },
        include: {
          origin: { select: { name: true } },
          destination: { select: { name: true } },
          shipperIndustry: { select: { name: true } },
          consigneeIndustry: { select: { name: true } },
        },
      },
      carCard: {
        include: {
          freightCar: {
            select: {
              reportingMarks: true,
              number: true,
              carType: true,
              aarTypeCode: true,
              homeRoad: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PrintPageShell
      title={`Print All Waybills (${waybills.length})`}
      backUrl={`/dashboard/railroad/${id}/waybills`}
    >
      {waybills.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground print:hidden">
          No waybills to print.
        </p>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {waybills.map((waybill) => (
            <div key={waybill.id} className="break-after-page">
              <WaybillPrintView waybill={waybill} />
            </div>
          ))}
        </div>
      )}
    </PrintPageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/dashboard/railroad/[id]/waybills/print/page.tsx
git commit -m "feat: add batch waybill print page with page breaks"
```

---

## Task 15: Add Print Buttons to Waybill List and Table

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/waybills/page.tsx`
- Modify: `components/waybills/waybill-table.tsx`
- Modify: `components/waybills/waybill-card-list.tsx`

- [ ] **Step 1: Add "Print All" button to waybills list page**

In `app/(dashboard)/dashboard/railroad/[id]/waybills/page.tsx`, add a "Print All" button next to the "Create Waybill" button. Import `Printer` from lucide-react.

Replace the button group section:

```typescript
// Old:
        <Button
          className="transition-all duration-150 hover:shadow-md"
          asChild
        >
          <Link href={`/dashboard/railroad/${id}/waybills/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Waybill
          </Link>
        </Button>

// New:
        <div className="flex items-center gap-2">
          {waybills.length > 0 && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/railroad/${id}/waybills/print`}>
                <Printer className="mr-2 h-4 w-4" />
                Print All
              </Link>
            </Button>
          )}
          <Button
            className="transition-all duration-150 hover:shadow-md"
            asChild
          >
            <Link href={`/dashboard/railroad/${id}/waybills/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Waybill
            </Link>
          </Button>
        </div>
```

Also add `Printer` to the lucide-react import.

- [ ] **Step 2: Add print icon to waybill table actions column**

In `components/waybills/waybill-table.tsx`, in the `actions` column cell, add a print button before the edit button:

```typescript
<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
  <Link href={`/dashboard/railroad/${layoutId}/waybills/${row.original.id}/print`}>
    <Printer className="h-3.5 w-3.5" />
    <span className="sr-only">Print</span>
  </Link>
</Button>
```

Also add `Printer` to the lucide-react import.

- [ ] **Step 3: Add print icon to waybill card list**

In `components/waybills/waybill-card-list.tsx`, add a print button to each card's action area. Import `Printer` from lucide-react and add a link button to each card that navigates to the print page.

Find the card actions area (where Edit and Delete buttons are) and add before them:

```typescript
<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
  <Link href={`/dashboard/railroad/${layoutId}/waybills/${waybill.id}/print`}>
    <Printer className="h-3.5 w-3.5" />
    <span className="sr-only">Print</span>
  </Link>
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/railroad/[id]/waybills/page.tsx components/waybills/waybill-table.tsx components/waybills/waybill-card-list.tsx
git commit -m "feat: add print buttons to waybill list page, table, and card views"
```

---

## Task 16: Build Verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. New routes should appear:
- `/dashboard/railroad/[id]/waybills/[waybillId]/print`
- `/dashboard/railroad/[id]/waybills/print`
- `/dashboard/railroad/[id]/import-export`

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors in new files.

- [ ] **Step 3: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "fix: lint corrections"
```

---
