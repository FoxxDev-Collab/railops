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
