/**
 * Simple 2D silhouette SVG icons for rolling stock types.
 * Each renders at a consistent height with proportional width,
 * designed to look like side-profile train car shapes on a track.
 */

import { SilhouetteImage } from "@/components/ui/silhouette-image";

interface CarSvgProps {
  className?: string;
  color?: string;
  label?: string;
  facing?: "F" | "R";
}

const WHEEL_R = 3;
const WHEEL_Y = 38;
const CAR_BOTTOM = 34;

function Wheels({ positions }: { positions: number[] }) {
  return (
    <>
      {positions.map((cx) => (
        <circle
          key={cx}
          cx={cx}
          cy={WHEEL_Y}
          r={WHEEL_R}
          className="fill-muted-foreground/70"
        />
      ))}
    </>
  );
}

function Rail() {
  return <line x1="0" y1="42" x2="100%" y2="42" className="stroke-muted-foreground/30" strokeWidth="1" />;
}

export function LocomotiveSvg({ className, color = "var(--chart-3)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 80 44" className={className} role="img" aria-label={label ?? "Locomotive"}>
      <g transform={flip ? "translate(80,0) scale(-1,1)" : undefined}>
        {/* Body */}
        <rect x="4" y="10" width="52" height="24" rx="2" fill={color} />
        {/* Hood / long hood */}
        <rect x="56" y="6" width="20" height="28" rx="3" fill={color} />
        {/* Cab windows */}
        <rect x="58" y="9" width="6" height="5" rx="1" className="fill-background/80" />
        <rect x="66" y="9" width="6" height="5" rx="1" className="fill-background/80" />
        {/* Headlight */}
        <circle cx="76" cy="12" r="2" className="fill-chart-5" />
        {/* Number board */}
        <rect x="10" y="14" width="14" height="6" rx="1" className="fill-background/60" />
        {/* Exhaust stacks */}
        <rect x="26" y="6" width="4" height="4" rx="1" fill={color} className="opacity-70" />
        <rect x="38" y="6" width="4" height="4" rx="1" fill={color} className="opacity-70" />
        {/* Trucks/wheels */}
        <rect x="8" y={CAR_BOTTOM} width="20" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="52" y={CAR_BOTTOM} width="20" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[14, 22, 58, 66]} />
      <Rail />
    </svg>
  );
}

export function BoxcarSvg({ className, color = "var(--chart-2)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 70 44" className={className} role="img" aria-label={label ?? "Boxcar"}>
      <g transform={flip ? "translate(70,0) scale(-1,1)" : undefined}>
        {/* Body */}
        <rect x="5" y="8" width="60" height="26" rx="1" fill={color} />
        {/* Roof line */}
        <rect x="5" y="7" width="60" height="3" rx="1" fill={color} className="opacity-80" />
        {/* Door */}
        <rect x="26" y="12" width="18" height="20" rx="0.5" className="fill-background/20" />
        <line x1="35" y1="12" x2="35" y2="32" className="stroke-background/30" strokeWidth="0.5" />
        {/* Door track */}
        <line x1="20" y1="32" x2="50" y2="32" className="stroke-background/15" strokeWidth="1" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="46" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[12, 20, 50, 58]} />
      <Rail />
    </svg>
  );
}

export function TankCarSvg({ className, color = "var(--chart-4)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 70 44" className={className} role="img" aria-label={label ?? "Tank Car"}>
      <g transform={flip ? "translate(70,0) scale(-1,1)" : undefined}>
        {/* Frame */}
        <rect x="5" y="30" width="60" height="4" rx="1" className="fill-muted-foreground/40" />
        {/* Tank body - elliptical */}
        <ellipse cx="35" cy="20" rx="28" ry="12" fill={color} />
        {/* Tank dome */}
        <rect x="30" y="6" width="10" height="6" rx="2" fill={color} className="opacity-80" />
        {/* Bands */}
        <line x1="18" y1="9" x2="18" y2="31" className="stroke-background/20" strokeWidth="1" />
        <line x1="52" y1="9" x2="52" y2="31" className="stroke-background/20" strokeWidth="1" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="46" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[12, 20, 50, 58]} />
      <Rail />
    </svg>
  );
}

export function HopperSvg({ className, color = "var(--chart-5)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 70 44" className={className} role="img" aria-label={label ?? "Hopper"}>
      <g transform={flip ? "translate(70,0) scale(-1,1)" : undefined}>
        {/* Hopper body - trapezoidal */}
        <polygon points="8,10 62,10 58,32 12,32" fill={color} />
        {/* Top rim */}
        <rect x="8" y="8" width="54" height="4" rx="1" fill={color} className="opacity-80" />
        {/* Slope lines */}
        <line x1="22" y1="10" x2="18" y2="32" className="stroke-background/15" strokeWidth="0.5" />
        <line x1="35" y1="10" x2="35" y2="32" className="stroke-background/15" strokeWidth="0.5" />
        <line x1="48" y1="10" x2="52" y2="32" className="stroke-background/15" strokeWidth="0.5" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="46" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[12, 20, 50, 58]} />
      <Rail />
    </svg>
  );
}

export function FlatcarSvg({ className, color = "var(--muted-foreground)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 70 44" className={className} role="img" aria-label={label ?? "Flatcar"}>
      <g transform={flip ? "translate(70,0) scale(-1,1)" : undefined}>
        {/* Deck */}
        <rect x="5" y="26" width="60" height="6" rx="1" fill={color} className="opacity-60" />
        {/* Stake pockets */}
        <rect x="10" y="22" width="2" height="4" rx="0.5" fill={color} className="opacity-40" />
        <rect x="25" y="22" width="2" height="4" rx="0.5" fill={color} className="opacity-40" />
        <rect x="43" y="22" width="2" height="4" rx="0.5" fill={color} className="opacity-40" />
        <rect x="58" y="22" width="2" height="4" rx="0.5" fill={color} className="opacity-40" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="46" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[12, 20, 50, 58]} />
      <Rail />
    </svg>
  );
}

export function PassengerCarSvg({ className, color = "var(--chart-1)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 80 44" className={className} role="img" aria-label={label ?? "Passenger Car"}>
      <g transform={flip ? "translate(80,0) scale(-1,1)" : undefined}>
        {/* Body */}
        <rect x="3" y="8" width="74" height="26" rx="3" fill={color} />
        {/* Window band */}
        <rect x="6" y="12" width="68" height="8" rx="1" className="fill-background/25" />
        {/* Individual windows */}
        {[10, 18, 26, 34, 42, 50, 58, 66].map((x) => (
          <rect key={x} x={x} y="13" width="5" height="6" rx="0.5" className="fill-background/50" />
        ))}
        {/* Roof detail */}
        <rect x="10" y="6" width="60" height="3" rx="1.5" fill={color} className="opacity-60" />
        {/* Vestibule ends */}
        <rect x="3" y="10" width="4" height="22" rx="1" fill={color} className="opacity-70" />
        <rect x="73" y="10" width="4" height="22" rx="1" fill={color} className="opacity-70" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="18" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="54" y={CAR_BOTTOM} width="18" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[13, 21, 59, 67]} />
      <Rail />
    </svg>
  );
}

export function CabooseSvg({ className, color = "var(--destructive)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 60 44" className={className} role="img" aria-label={label ?? "Caboose"}>
      <g transform={flip ? "translate(60,0) scale(-1,1)" : undefined}>
        {/* Body */}
        <rect x="5" y="12" width="50" height="22" rx="2" fill={color} />
        {/* Cupola */}
        <rect x="18" y="4" width="24" height="10" rx="2" fill={color} />
        {/* Cupola windows */}
        <rect x="21" y="6" width="5" height="4" rx="0.5" className="fill-background/50" />
        <rect x="34" y="6" width="5" height="4" rx="0.5" className="fill-background/50" />
        {/* Body windows */}
        <rect x="10" y="16" width="5" height="5" rx="0.5" className="fill-background/40" />
        <rect x="20" y="16" width="5" height="5" rx="0.5" className="fill-background/40" />
        <rect x="35" y="16" width="5" height="5" rx="0.5" className="fill-background/40" />
        <rect x="45" y="16" width="5" height="5" rx="0.5" className="fill-background/40" />
        {/* Platform / end railings */}
        <line x1="3" y1="24" x2="5" y2="24" className="stroke-background/30" strokeWidth="1" />
        <line x1="55" y1="24" x2="57" y2="24" className="stroke-background/30" strokeWidth="1" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="14" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="38" y={CAR_BOTTOM} width="14" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[12, 18, 42, 48]} />
      <Rail />
    </svg>
  );
}

export function MowEquipmentSvg({ className, color = "var(--chart-5)", label, facing }: CarSvgProps) {
  const flip = facing === "R";
  return (
    <svg viewBox="0 0 70 44" className={className} role="img" aria-label={label ?? "MOW Equipment"}>
      <g transform={flip ? "translate(70,0) scale(-1,1)" : undefined}>
        {/* Flatcar base */}
        <rect x="5" y="26" width="60" height="8" rx="1" fill={color} className="opacity-50" />
        {/* Equipment body */}
        <rect x="12" y="14" width="30" height="12" rx="2" fill={color} />
        {/* Crane arm */}
        <line x1="42" y1="18" x2="58" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="58" y1="8" x2="58" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Warning stripe */}
        <rect x="12" y="24" width="30" height="2" className="fill-chart-5/60" />
        {/* Trucks */}
        <rect x="8" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
        <rect x="46" y={CAR_BOTTOM} width="16" height="4" rx="1" className="fill-muted-foreground/50" />
      </g>
      <Wheels positions={[12, 20, 50, 58]} />
      <Rail />
    </svg>
  );
}

// ─── Mapping helper ──────────────────────────────────────────────────────────

type StockType = "LOCOMOTIVE" | "FREIGHT_CAR" | "PASSENGER_CAR" | "CABOOSE" | "MOW_EQUIPMENT";

const STOCK_COLORS: Record<StockType, string> = {
  LOCOMOTIVE: "var(--chart-3)",
  FREIGHT_CAR: "var(--chart-2)",
  PASSENGER_CAR: "var(--chart-1)",
  CABOOSE: "var(--destructive)",
  MOW_EQUIPMENT: "var(--chart-5)",
};

export function RollingStockIcon({
  type,
  className,
  facing,
  label,
  silhouette,
}: {
  type: StockType;
  className?: string;
  facing?: "F" | "R";
  label?: string;
  silhouette?: { filePath: string; name: string } | null;
}) {
  // If a specific silhouette is assigned, use it
  if (silhouette) {
    return (
      <div className={className} style={facing === "R" ? { transform: "scaleX(-1)" } : undefined}>
        <SilhouetteImage
          filePath={silhouette.filePath}
          alt={silhouette.name}
          className="h-full w-full"
        />
      </div>
    );
  }

  // Fall back to generic inline SVG
  const color = STOCK_COLORS[type];
  const props = { className, color, label, facing };

  switch (type) {
    case "LOCOMOTIVE":
      return <LocomotiveSvg {...props} />;
    case "FREIGHT_CAR":
      return <BoxcarSvg {...props} />;
    case "PASSENGER_CAR":
      return <PassengerCarSvg {...props} />;
    case "CABOOSE":
      return <CabooseSvg {...props} />;
    case "MOW_EQUIPMENT":
      return <MowEquipmentSvg {...props} />;
  }
}
