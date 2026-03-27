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

  const panels: (WaybillPrintPanel | null)[] = [null, null, null, null];
  for (const p of waybill.panels) {
    panels[p.panelNumber - 1] = p;
  }

  return (
    <div
      className="mx-auto bg-white text-black"
      style={{ width: "5in", height: "3.5in" }}
    >
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
