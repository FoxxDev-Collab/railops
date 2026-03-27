import {
  MapPin,
  Factory,
  Train,
  FileText,
  Route,
  Link as LinkIcon,
  ClipboardList,
} from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Locations",
    subtitle: "Where things happen",
    icon: MapPin,
    anchor: "#locations",
  },
  {
    number: 2,
    title: "Industries",
    subtitle: "Who ships & receives",
    icon: Factory,
    anchor: "#industries",
  },
  {
    number: 3,
    title: "Rolling Stock",
    subtitle: "Your fleet",
    icon: Train,
    anchor: "#rolling-stock",
  },
  {
    number: 4,
    title: "Waybills",
    subtitle: "Shipping orders",
    icon: FileText,
    anchor: "#waybills",
  },
  {
    number: 5,
    title: "Trains",
    subtitle: "Routes & schedules",
    icon: Route,
    anchor: "#trains",
  },
  {
    number: 6,
    title: "Consists",
    subtitle: "Build your train",
    icon: LinkIcon,
    anchor: "#consists",
  },
  {
    number: 7,
    title: "Switch Lists",
    subtitle: "Crew instructions",
    icon: ClipboardList,
    anchor: "#switch-lists",
  },
];

export function WorkflowStepper() {
  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-start flex-1">
            <a
              href={step.anchor}
              className="group flex flex-col items-center text-center w-full"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary group-hover:border-primary group-hover:bg-primary/20 transition-colors">
                <step.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-2 text-xs font-semibold leading-tight">
                {step.title}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                {step.subtitle}
              </p>
            </a>
            {i < steps.length - 1 && (
              <div className="mt-5 h-px flex-1 min-w-3 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <a
                href={step.anchor}
                className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary hover:border-primary hover:bg-primary/20 transition-colors"
              >
                <step.icon className="h-4 w-4" />
              </a>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-border my-1" />
              )}
            </div>
            <a href={step.anchor} className="pb-4">
              <p className="text-sm font-semibold leading-tight">
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {step.subtitle}
              </p>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
