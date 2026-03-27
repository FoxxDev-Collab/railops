# Print Waybills & CSV Import/Export — Design Spec

## Overview

Two features that RailOps lists but does not yet support:

1. **Print Waybills** — traditional NMRA car card format, individual and batch
2. **CSV Import/Export** — bulk data migration and backup across all major resource types

---

## 1. Print Waybills

### Car Card Layout

Standard NMRA car card format sized for physical car card holders (3.5" x 5", matching standard index card size):

- **Card header:** freight car reporting marks + number, AAR type code, home road
- **4 panels in a 2x2 grid**, each showing:
  - Panel number (1-4)
  - Load status (LOADED / EMPTY)
  - Origin location + shipper industry
  - Destination location + consignee industry
  - Commodity + weight
  - Route via
  - Special instructions
- **Dotted fold lines** between panels
- Black-on-white, printer-friendly

### Individual Print

- **Route:** `.../waybills/[waybillId]/print`
- Server component fetches the waybill with all relations (panels, car card, freight car, locations, industries)
- Renders `WaybillPrintView` component
- Screen shows a preview with a "Print" button at top
- `print:` styles hide the button, show only the card
- Triggered via `window.print()`

### Batch Print

- **Route:** `.../waybills/print`
- Fetches all waybills for the railroad
- Renders one `WaybillPrintView` per waybill
- `break-after-page` CSS separates each card onto its own page
- "Print All" button on the waybills list page links here

### Print Styling

- Tailwind `print:` variant (matches existing switch list pattern)
- Force black-on-white for printer compatibility
- Hide all app chrome (sidebar, header, nav)

### Tier Gating

- Available to all tiers (waybill generation is a Hobbyist feature)

---

## 2. CSV Export

### Infrastructure

- **`lib/csv/export.ts`** — generic `toCSV(rows, columns)` utility handling escaping, headers, quoting
- **`app/actions/csv-export.ts`** — one export function per resource type; queries DB, maps to flat rows, calls `toCSV`
- **Client helper** — `triggerDownload(csvString, filename)` creates a Blob URL and clicks a hidden anchor

### Export Formats (flat CSV, one row per record)

| Resource | Key Columns |
|----------|-------------|
| Locations | name, locationType, description, town, subdivision |
| Industries | name, locationName, commoditiesReceived, commoditiesShipped, trackCapacity |
| Freight Cars | reportingMarks, carNumber, aarType, description, homeRoad, commodity, currentLocation, status |
| Locomotives | reportingMarks, roadNumber, model, dccAddress, decoderManufacturer, currentLocation, status |
| Passenger Cars | reportingMarks, carNumber, carType, description, homeRoad, currentLocation, status |
| Cabooses | reportingMarks, carNumber, description, homeRoad, currentLocation, status |
| MOW Equipment | reportingMarks, equipmentNumber, equipmentType, description, currentLocation, status |
| Trains | name, trainNumber, trainClass, serviceType, origin, destination |

### File Naming

`railops-{type}-{YYYY-MM-DD}.csv`

---

## 3. CSV Import

### Infrastructure

- **`lib/csv/parse.ts`** — generic CSV parser handling quoted fields, escaped commas, header row detection
- **`lib/csv/validate.ts`** — per-resource-type validation using Zod schemas (reuse existing form schemas where possible)
- **`app/actions/csv-import.ts`** — parse, validate, return preview; then bulk create on confirmation

### Import Flow (3 steps)

1. **Upload** — user selects resource type, uploads a CSV file. Client reads the file and sends the raw string to a server action.
2. **Preview** — server parses and validates every row. Returns structured result: valid rows, invalid rows with per-row error messages (which field, what's wrong). Client renders a preview table — valid rows shown normally, invalid rows highlighted with inline errors. Shows counts: "42 valid, 3 errors".
3. **Confirm** — user proceeds with valid rows only (invalid rows skipped). Server action bulk-creates records. Returns success count and any creation errors.

### Validation Rules

- **Required fields** enforced per type (e.g., freight car must have reportingMarks, carNumber, aarType)
- **Enum fields** validated against allowed values (e.g., locationType must be PASSENGER_STATION, YARD, etc.)
- **Foreign key references** resolved by name (e.g., "currentLocation" matched against existing location names — error if no match)
- **Duplicate detection** (e.g., freight car with same reportingMarks + carNumber already exists)

### Template Downloads

Each resource type provides a downloadable CSV template with headers and one example row so users know the expected format.

---

## 4. Page Structure & Navigation

### Combined Import/Export Page

- **Route:** `.../railroad/[id]/import-export`
- **Two tabs:** Import and Export
- **Sidebar nav item:** "Import / Export" icon, placed in the railroad navigation

### Export Tab

- Card grid or checklist showing all exportable resource types
- User selects which types to export
- Each selected type downloads as its own CSV file

### Import Tab

- Resource type dropdown selector
- Template download link per type
- File upload area (drag-and-drop or click)
- Preview table with valid/invalid row highlighting
- Confirm button to import valid rows

### Print Pages

- `.../waybills/[waybillId]/print` — single waybill car card
- `.../waybills/print` — batch print all waybills
- "Print" button on individual waybill rows/cards links to single print page
- "Print All" button on waybills list page links to batch print page

### Tier Gating

- **Import/Export:** Operator+ tier only. Hobbyist users see an upgrade prompt.
- **Print Waybills:** All tiers.

---

## 5. Technical Decisions

- **Server Actions pattern** (approach A) — consistent with rest of app, no new API routes
- **Tailwind `print:` variant** — matches existing switch list implementation
- **`window.print()`** — browser-native, no print library dependencies
- **Client-side Blob download** — no server-side file streaming needed for CSV
- **Zod validation** — reuse existing form schemas for import validation where possible
- **Row-by-row import preview** — users can import valid rows and skip errors without fixing the entire file
