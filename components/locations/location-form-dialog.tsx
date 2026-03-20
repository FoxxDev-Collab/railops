"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LocationType } from "@prisma/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Building2,
  ArrowLeftRight,
  GitFork,
  Layers,
  Users,
  Fence,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createLocation, updateLocation } from "@/app/actions/locations";

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  locationType: z.nativeEnum(LocationType),
  description: z.string().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  population: z.coerce.number().int().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

type FormValues = z.infer<typeof locationSchema>;

const locationTypes: {
  value: LocationType;
  label: string;
  description: string;
  icon: React.ElementType;
} [] = [
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

interface LocationFormDialogProps {
  layoutId: string;
  initialData?: {
    id: string;
    name: string;
    code: string;
    locationType: LocationType;
    description?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    population?: number | null;
    sortOrder?: number;
  };
  trigger: React.ReactNode;
}

export function LocationFormDialog({
  layoutId,
  initialData,
  trigger,
}: LocationFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"type" | "details">(
    initialData ? "details" : "type"
  );
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(locationSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      code: initialData?.code ?? "",
      locationType: initialData?.locationType ?? "PASSENGER_STATION",
      description: initialData?.description ?? "",
      latitude: initialData?.latitude ?? null,
      longitude: initialData?.longitude ?? null,
      population: initialData?.population ?? null,
      sortOrder: initialData?.sortOrder ?? 0,
    },
  });

  const selectedType = form.watch("locationType");

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setStep(isEdit ? "details" : "type");
      if (!isEdit) form.reset();
    }
  }, [open, isEdit, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateLocation(initialData.id, values)
      : await createLocation(layoutId, values);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Location updated" : "Location created");
      setOpen(false);
      form.reset();
      router.refresh();
    }

    setIsLoading(false);
  }

  function handleTypeSelect(type: LocationType) {
    form.setValue("locationType", type);
    setStep("details");
  }

  const selectedTypeInfo = locationTypes.find((t) => t.value === selectedType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden gap-0">
        {/* Header with type indicator */}
        <div className="relative border-b bg-muted/30 px-6 pt-6 pb-4">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 11px,
                currentColor 11px,
                currentColor 12px
              )`,
            }}
          />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              {selectedTypeInfo && step === "details" && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 border border-primary/20"
                >
                  <selectedTypeInfo.icon className="h-5 w-5 text-primary" />
                </motion.div>
              )}
              <div>
                <DialogTitle className="text-lg tracking-wide">
                  {isEdit
                    ? `Edit ${initialData.name}`
                    : step === "type"
                      ? "New Location"
                      : `New ${selectedTypeInfo?.label ?? "Location"}`}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1 tracking-wider uppercase text-muted-foreground/70">
                  {step === "type"
                    ? "Select a location type"
                    : isEdit
                      ? "Update location details"
                      : "Configure location details"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === "type" && !isEdit ? (
              <motion.div
                key="type-select"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 gap-2"
              >
                {locationTypes.map((type, i) => {
                  const Icon = type.icon;
                  return (
                    <motion.button
                      key={type.value}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => handleTypeSelect(type.value)}
                      className="group relative flex items-start gap-3 rounded-md border border-border/60 p-3 text-left
                        hover:border-primary/40 hover:bg-primary/[0.03]
                        transition-all duration-150 cursor-pointer"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded bg-muted/60 shrink-0
                        group-hover:bg-primary/10 transition-colors duration-150">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight">
                          {type.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                          {type.description}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="details-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
                    {/* Name + Code row */}
                    <div className="grid grid-cols-[1fr_120px] gap-3">
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Type selector (inline for edit mode) */}
                    {isEdit && (
                      <FormField
                        control={form.control}
                        name="locationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                              Type
                            </FormLabel>
                            <div className="flex flex-wrap gap-1.5">
                              {locationTypes.map((type) => {
                                const Icon = type.icon;
                                const isSelected = field.value === type.value;
                                return (
                                  <button
                                    key={type.value}
                                    type="button"
                                    onClick={() =>
                                      field.onChange(type.value)
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs
                                      transition-all duration-150 cursor-pointer
                                      ${
                                        isSelected
                                          ? "border-primary bg-primary/10 text-primary font-medium"
                                          : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                                      }`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {type.label}
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

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

                    {/* Optional details row */}
                    <div className="grid grid-cols-3 gap-3">
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
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null
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
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      {!isEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setStep("type")}
                          className="text-xs text-muted-foreground"
                        >
                          <MapPin className="mr-1.5 h-3 w-3" />
                          Change type
                        </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isLoading}
                          className="min-w-[100px] transition-all duration-150"
                        >
                          {isLoading ? (
                            <motion.div
                              className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          ) : isEdit ? (
                            "Save Changes"
                          ) : (
                            "Add Location"
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
