"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LocationType } from "@prisma/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Layers,
  ArrowLeftRight,
  GitFork,
  Users,
  Fence,
  X,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createLocation, updateLocation } from "@/app/actions/locations";

// --- Schema ---

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  locationType: z.nativeEnum(LocationType),
  description: z.string().optional(),
  population: z.coerce.number().int().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  // Type-specific — stored as typeAttributes on server
  stationClass: z.string().optional().nullable(),
  platformCount: z.coerce.number().int().optional().nullable(),
  hasFreightHouse: z.boolean().optional(),
  hasExpressService: z.boolean().optional(),
  yardType: z.string().optional().nullable(),
  hasEngineFacilities: z.boolean().optional(),
  hasRipTrack: z.boolean().optional(),
  hasCabooseTrack: z.boolean().optional(),
  totalCarCapacity: z.coerce.number().int().optional().nullable(),
  connectingRailroads: z.array(z.string()).optional(),
  interchangeDirection: z.string().optional().nullable(),
  trackCount: z.coerce.number().int().optional().nullable(),
  carCapacity: z.coerce.number().int().optional().nullable(),
  convergingLines: z.array(z.string()).optional(),
  hasSignals: z.boolean().optional(),
  controlPoint: z.string().optional().nullable(),
  hasPassingSiding: z.boolean().optional(),
  represents: z.string().optional().nullable(),
  stagingType: z.string().optional().nullable(),
  stagingTrackCount: z.coerce.number().int().optional().nullable(),
  stagingCarCapacity: z.coerce.number().int().optional().nullable(),
  isFiddleYard: z.boolean().optional(),
  carSpots: z.coerce.number().int().optional().nullable(),
  hasLoadingDock: z.boolean().optional(),
  hasScaleTrack: z.boolean().optional(),
  sidingType: z.string().optional().nullable(),
  lengthInCarLengths: z.coerce.number().int().optional().nullable(),
  sidingCarCapacity: z.coerce.number().int().optional().nullable(),
  isDoubleEnded: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// --- Location types config ---

const locationTypes: {
  value: LocationType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "PASSENGER_STATION",
    label: "Station",
    description: "Passenger depot or freight station",
    icon: Building2,
  },
  {
    value: "YARD",
    label: "Yard",
    description: "Classification or staging yard",
    icon: Layers,
  },
  {
    value: "INTERCHANGE",
    label: "Interchange",
    description: "Connection with another railroad",
    icon: ArrowLeftRight,
  },
  {
    value: "JUNCTION",
    label: "Junction",
    description: "Where lines diverge or converge",
    icon: GitFork,
  },
  {
    value: "STAGING",
    label: "Staging",
    description: "Off-layout staging area",
    icon: Layers,
  },
  {
    value: "TEAM_TRACK",
    label: "Team Track",
    description: "Public delivery track",
    icon: Users,
  },
  {
    value: "SIDING",
    label: "Siding",
    description: "Industry siding or passing siding",
    icon: Fence,
  },
];

// --- Tag input for arrays ---

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Type and press Enter"}
          className="h-9 text-sm transition-shadow duration-150 focus:shadow-md"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="h-9 px-3 text-xs shrink-0"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1 text-xs">
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="ml-0.5 rounded-sm hover:bg-foreground/10 p-0.5 transition-colors cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Boolean toggle button ---

function BoolToggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all duration-150 cursor-pointer w-full justify-between
        ${
          value
            ? "border-primary bg-primary/10 text-primary font-medium"
            : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
        }`}
    >
      <span>{label}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors duration-150 ${
          value
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {value ? "YES" : "NO"}
      </span>
    </button>
  );
}

// --- Props ---

export interface LocationWithAttributes {
  id: string;
  name: string;
  code: string;
  locationType: LocationType;
  description?: string | null;
  population?: number | null;
  sortOrder?: number;
  typeAttributes?: Record<string, unknown> | null;
  industries?: unknown[];
  yardTracks?: unknown[];
}

interface LocationFormProps {
  layoutId: string;
  initialData?: LocationWithAttributes;
  backUrl: string;
}

// --- Main component ---

export function LocationForm({ layoutId, initialData, backUrl }: LocationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!initialData;

  const attrs = (initialData?.typeAttributes ?? {}) as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      code: initialData?.code ?? "",
      locationType: initialData?.locationType ?? "PASSENGER_STATION",
      description: initialData?.description ?? "",
      population: initialData?.population ?? null,
      sortOrder: initialData?.sortOrder ?? 0,
      // PASSENGER_STATION
      stationClass: (attrs.stationClass as string) ?? null,
      platformCount: (attrs.platformCount as number) ?? null,
      hasFreightHouse: (attrs.hasFreightHouse as boolean) ?? false,
      hasExpressService: (attrs.hasExpressService as boolean) ?? false,
      // YARD
      yardType: (attrs.yardType as string) ?? null,
      hasEngineFacilities: (attrs.hasEngineFacilities as boolean) ?? false,
      hasRipTrack: (attrs.hasRipTrack as boolean) ?? false,
      hasCabooseTrack: (attrs.hasCabooseTrack as boolean) ?? false,
      totalCarCapacity: (attrs.totalCarCapacity as number) ?? null,
      // INTERCHANGE
      connectingRailroads: (attrs.connectingRailroads as string[]) ?? [],
      interchangeDirection: (attrs.interchangeDirection as string) ?? null,
      trackCount: (attrs.trackCount as number) ?? null,
      carCapacity: (attrs.carCapacity as number) ?? null,
      // JUNCTION
      convergingLines: (attrs.convergingLines as string[]) ?? [],
      hasSignals: (attrs.hasSignals as boolean) ?? false,
      controlPoint: (attrs.controlPoint as string) ?? null,
      hasPassingSiding: (attrs.hasPassingSiding as boolean) ?? false,
      // STAGING
      represents: (attrs.represents as string) ?? null,
      stagingType: (attrs.stagingType as string) ?? null,
      stagingTrackCount: (attrs.trackCount as number) ?? null,
      stagingCarCapacity: (attrs.totalCarCapacity as number) ?? null,
      isFiddleYard: (attrs.isFiddleYard as boolean) ?? false,
      // TEAM_TRACK
      carSpots: (attrs.carSpots as number) ?? null,
      hasLoadingDock: (attrs.hasLoadingDock as boolean) ?? false,
      hasScaleTrack: (attrs.hasScaleTrack as boolean) ?? false,
      // SIDING
      sidingType: (attrs.sidingType as string) ?? null,
      lengthInCarLengths: (attrs.lengthInCarLengths as number) ?? null,
      sidingCarCapacity: (attrs.carCapacity as number) ?? null,
      isDoubleEnded: (attrs.isDoubleEnded as boolean) ?? false,
    },
  });

  const selectedType = form.watch("locationType");
  const selectedTypeInfo = locationTypes.find((t) => t.value === selectedType);

  function buildTypeAttributes(values: FormValues): Record<string, unknown> {
    switch (values.locationType) {
      case "PASSENGER_STATION":
        return {
          stationClass: values.stationClass,
          platformCount: values.platformCount,
          hasFreightHouse: values.hasFreightHouse ?? false,
          hasExpressService: values.hasExpressService ?? false,
        };
      case "YARD":
        return {
          yardType: values.yardType,
          hasEngineFacilities: values.hasEngineFacilities ?? false,
          hasRipTrack: values.hasRipTrack ?? false,
          hasCabooseTrack: values.hasCabooseTrack ?? false,
          totalCarCapacity: values.totalCarCapacity,
        };
      case "INTERCHANGE":
        return {
          connectingRailroads: values.connectingRailroads ?? [],
          interchangeDirection: values.interchangeDirection,
          trackCount: values.trackCount,
          carCapacity: values.carCapacity,
        };
      case "JUNCTION":
        return {
          convergingLines: values.convergingLines ?? [],
          hasSignals: values.hasSignals ?? false,
          controlPoint: values.controlPoint,
          hasPassingSiding: values.hasPassingSiding ?? false,
        };
      case "STAGING":
        return {
          represents: values.represents,
          stagingType: values.stagingType,
          trackCount: values.stagingTrackCount,
          totalCarCapacity: values.stagingCarCapacity,
          isFiddleYard: values.isFiddleYard ?? false,
        };
      case "TEAM_TRACK":
        return {
          carSpots: values.carSpots,
          hasLoadingDock: values.hasLoadingDock ?? false,
          hasScaleTrack: values.hasScaleTrack ?? false,
        };
      case "SIDING":
        return {
          sidingType: values.sidingType,
          lengthInCarLengths: values.lengthInCarLengths,
          carCapacity: values.sidingCarCapacity,
          isDoubleEnded: values.isDoubleEnded ?? false,
        };
      default:
        return {};
    }
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const typeAttributes = buildTypeAttributes(values);
    const payload = {
      name: values.name,
      code: values.code,
      locationType: values.locationType,
      description: values.description,
      population: values.locationType === "PASSENGER_STATION" ? values.population : null,
      sortOrder: values.sortOrder,
      typeAttributes,
    };

    const result = isEdit
      ? await updateLocation(initialData!.id, payload)
      : await createLocation(layoutId, payload);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success(isEdit ? "Location updated" : "Location created");
    router.push(backUrl);
  }

  const typeLabel = selectedTypeInfo?.label ?? "Location";
  const TypeIcon = selectedTypeInfo?.icon ?? MapPin;

  return (
    <div className="space-y-6">
      {/* Back link + page title */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backUrl}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? `Edit: ${initialData!.name}` : `New ${typeLabel}`}
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            {isEdit
              ? "Update location details and configuration"
              : "Configure location details and type-specific attributes"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Type Selection Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Location Type
              </CardTitle>
              <CardDescription>
                Choose what kind of location this is on your railroad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {locationTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = field.value === type.value;
                        return (
                          <motion.button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            whileTap={{ scale: 0.97 }}
                            className={`group relative flex flex-col items-start gap-1.5 rounded-md border p-3 text-left
                              transition-all duration-150 cursor-pointer
                              ${
                                isSelected
                                  ? "border-primary bg-primary/[0.06] shadow-sm"
                                  : "border-border/60 hover:border-primary/30 hover:bg-muted/30"
                              }`}
                          >
                            <div
                              className={`flex items-center justify-center w-7 h-7 rounded transition-colors duration-150
                                ${isSelected ? "bg-primary/15" : "bg-muted/60 group-hover:bg-primary/10"}`}
                            >
                              <Icon
                                className={`h-3.5 w-3.5 transition-colors duration-150 ${
                                  isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                                }`}
                              />
                            </div>
                            <div>
                              <div
                                className={`text-xs font-medium leading-tight ${
                                  isSelected ? "text-primary" : ""
                                }`}
                              >
                                {type.label}
                              </div>
                              <div className="text-[10px] text-muted-foreground/70 leading-snug mt-0.5 hidden sm:block">
                                {type.description}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Basic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Name + Code */}
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Springfield Yard"
                          className="h-10 transition-shadow duration-150 focus:shadow-md"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SPF"
                          className="h-10 font-mono tracking-widest text-center uppercase transition-shadow duration-150 focus:shadow-md"
                          maxLength={10}
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-[10px] text-center">
                        Unique ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional — describe this location's role on the railroad..."
                        className="resize-none min-h-[72px] transition-shadow duration-150 focus:shadow-md"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sort order + Population (station only) */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Sort Order
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-10 text-center transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormControl>
                      <FormDescription className="text-[10px] text-center">
                        Display order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === "PASSENGER_STATION" && (
                  <FormField
                    control={form.control}
                    name="population"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                          Population
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="—"
                            className="h-10 text-center transition-shadow duration-150 focus:shadow-md"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-[10px] text-center">
                          Town size
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Type-Specific Configuration Card */}
          <AnimatePresence mode="wait" key="type-config">
            {selectedType && (
              <motion.div
                key={selectedType}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/10">
                        <TypeIcon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                          {typeLabel} Configuration
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Attributes specific to this location type
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* ---- PASSENGER_STATION ---- */}
                    {selectedType === "PASSENGER_STATION" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="stationClass"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Station Class
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Flag Stop">Flag Stop</SelectItem>
                                    <SelectItem value="Whistle Stop">Whistle Stop</SelectItem>
                                    <SelectItem value="Local Depot">Local Depot</SelectItem>
                                    <SelectItem value="Division Point">Division Point</SelectItem>
                                    <SelectItem value="Terminal">Terminal</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="platformCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Platforms
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="hasFreightHouse"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Freight House"
                                />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hasExpressService"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Express Service"
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* ---- YARD ---- */}
                    {selectedType === "YARD" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="yardType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Yard Type
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Flat">Flat</SelectItem>
                                    <SelectItem value="Through">Through</SelectItem>
                                    <SelectItem value="Hump">Hump</SelectItem>
                                    <SelectItem value="Stub">Stub</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="totalCarCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Car Capacity
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="hasEngineFacilities"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Engine Facilities"
                                />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hasRipTrack"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="RIP Track"
                                />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hasCabooseTrack"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Caboose Track"
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* ---- INTERCHANGE ---- */}
                    {selectedType === "INTERCHANGE" && (
                      <div className="space-y-5">
                        <FormField
                          control={form.control}
                          name="connectingRailroads"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                Connecting Railroads
                              </FormLabel>
                              <TagInput
                                value={field.value ?? []}
                                onChange={field.onChange}
                                placeholder="e.g. BNSF, UP"
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="interchangeDirection"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Direction
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Inbound">Inbound</SelectItem>
                                    <SelectItem value="Outbound">Outbound</SelectItem>
                                    <SelectItem value="Bidirectional">Bidirectional</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="trackCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Tracks
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="carCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Car Capacity
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* ---- JUNCTION ---- */}
                    {selectedType === "JUNCTION" && (
                      <div className="space-y-5">
                        <FormField
                          control={form.control}
                          name="convergingLines"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                Converging Lines
                              </FormLabel>
                              <TagInput
                                value={field.value ?? []}
                                onChange={field.onChange}
                                placeholder="e.g. Main Line, Branch"
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="controlPoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                Control Point Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. CP BAKER"
                                  className="h-10 uppercase font-mono tracking-wider"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value.toUpperCase())
                                  }
                                />
                              </FormControl>
                              <FormDescription className="text-[10px]">
                                CTC control point designation
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="hasSignals"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Has Signals"
                                />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hasPassingSiding"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Passing Siding"
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* ---- STAGING ---- */}
                    {selectedType === "STAGING" && (
                      <div className="space-y-5">
                        <FormField
                          control={form.control}
                          name="represents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                Represents
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Chicago Union Station"
                                  className="h-10"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormDescription className="text-[10px]">
                                Real-world destination this staging simulates
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="stagingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Staging Type
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Stub">Stub</SelectItem>
                                    <SelectItem value="Through">Through</SelectItem>
                                    <SelectItem value="Cassette">Cassette</SelectItem>
                                    <SelectItem value="Helix">Helix</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="stagingTrackCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Tracks
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="stagingCarCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Car Capacity
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="isFiddleYard"
                          render={({ field }) => (
                            <FormItem className="max-w-xs">
                              <BoolToggle
                                value={field.value ?? false}
                                onChange={field.onChange}
                                label="Fiddle Yard"
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* ---- TEAM_TRACK ---- */}
                    {selectedType === "TEAM_TRACK" && (
                      <div className="space-y-5">
                        <FormField
                          control={form.control}
                          name="carSpots"
                          render={({ field }) => (
                            <FormItem className="max-w-[180px]">
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                Car Spots
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="—"
                                  className="h-10 text-center"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value ? Number(e.target.value) : null)
                                  }
                                />
                              </FormControl>
                              <FormDescription className="text-[10px] text-center">
                                Number of car spots
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="hasLoadingDock"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Loading Dock"
                                />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hasScaleTrack"
                            render={({ field }) => (
                              <FormItem>
                                <BoolToggle
                                  value={field.value ?? false}
                                  onChange={field.onChange}
                                  label="Scale Track"
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* ---- SIDING ---- */}
                    {selectedType === "SIDING" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="sidingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Siding Type
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Passing">Passing</SelectItem>
                                    <SelectItem value="Industry Spur">Industry Spur</SelectItem>
                                    <SelectItem value="House Track">House Track</SelectItem>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lengthInCarLengths"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Length (Cars)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormDescription className="text-[10px] text-center">
                                  Car lengths
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="sidingCarCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Car Capacity
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    className="h-10 text-center"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : null)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="isDoubleEnded"
                          render={({ field }) => (
                            <FormItem className="max-w-xs">
                              <BoolToggle
                                value={field.value ?? false}
                                onChange={field.onChange}
                                label="Double-Ended"
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button type="button" variant="ghost" asChild>
              <Link href={backUrl}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[140px] transition-all duration-150"
            >
              {isLoading ? (
                <motion.div
                  className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                `Add ${typeLabel}`
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
