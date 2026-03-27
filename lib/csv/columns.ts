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
