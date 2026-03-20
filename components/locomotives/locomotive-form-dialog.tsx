"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LocomotiveType, LocomotiveService, RollingStockStatus } from "@prisma/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, Volume2, VolumeOff } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createLocomotive, updateLocomotive } from "@/app/actions/locomotives";

const locomotiveSchema = z.object({
  road: z.string().min(1, "Railroad is required"),
  number: z.string().min(1, "Number is required"),
  model: z.string().min(1, "Model is required"),
  locomotiveType: z.nativeEnum(LocomotiveType),
  serviceType: z.nativeEnum(LocomotiveService).optional(),
  horsepower: z.coerce.number().int().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  dccAddress: z.coerce.number().int().optional().nullable(),
  decoderManufacturer: z.string().optional().nullable(),
  decoderModel: z.string().optional().nullable(),
  hasSound: z.boolean().optional(),
  length: z.coerce.number().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  canPull: z.coerce.number().int().optional().nullable(),
  currentLocationId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof locomotiveSchema>;

const locoTypes: { value: LocomotiveType; label: string }[] = [
  { value: "STEAM", label: "Steam" },
  { value: "DIESEL_ROAD", label: "Diesel (Road)" },
  { value: "DIESEL_SWITCHER", label: "Diesel (Switcher)" },
  { value: "DIESEL_CAB", label: "Diesel (Cab Unit)" },
  { value: "ELECTRIC", label: "Electric" },
];

const serviceTypes: { value: LocomotiveService; label: string }[] = [
  { value: "ROAD_FREIGHT", label: "Road Freight" },
  { value: "PASSENGER", label: "Passenger" },
  { value: "YARD_SWITCHER", label: "Yard Switcher" },
  { value: "HELPER", label: "Helper" },
];

const statusOptions: { value: RollingStockStatus; label: string }[] = [
  { value: "SERVICEABLE", label: "Serviceable" },
  { value: "BAD_ORDER", label: "Bad Order" },
  { value: "STORED", label: "Stored" },
  { value: "RETIRED", label: "Retired" },
];

interface LocomotiveFormDialogProps {
  layoutId: string;
  initialData?: {
    id: string;
    road: string;
    number: string;
    model: string;
    locomotiveType: LocomotiveType;
    serviceType: LocomotiveService;
    horsepower: number | null;
    status: RollingStockStatus;
    dccAddress: number | null;
    decoderManufacturer: string | null;
    decoderModel: string | null;
    hasSound: boolean;
    length: number | null;
    fuelType: string | null;
    canPull: number | null;
    currentLocationId: string | null;
  };
  trigger: React.ReactNode;
}

export function LocomotiveFormDialog({
  layoutId,
  initialData,
  trigger,
}: LocomotiveFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDcc, setShowDcc] = useState(
    !!(initialData?.dccAddress || initialData?.decoderManufacturer)
  );
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(locomotiveSchema) as any,
    defaultValues: {
      road: initialData?.road ?? "",
      number: initialData?.number ?? "",
      model: initialData?.model ?? "",
      locomotiveType: initialData?.locomotiveType ?? "DIESEL_ROAD",
      serviceType: initialData?.serviceType ?? "ROAD_FREIGHT",
      horsepower: initialData?.horsepower ?? null,
      status: initialData?.status ?? "SERVICEABLE",
      dccAddress: initialData?.dccAddress ?? null,
      decoderManufacturer: initialData?.decoderManufacturer ?? "",
      decoderModel: initialData?.decoderModel ?? "",
      hasSound: initialData?.hasSound ?? false,
      length: initialData?.length ?? null,
      fuelType: initialData?.fuelType ?? "",
      canPull: initialData?.canPull ?? null,
      currentLocationId: initialData?.currentLocationId ?? null,
    },
  });

  useEffect(() => {
    if (open && !isEdit) {
      form.reset();
      setShowDcc(false);
    }
  }, [open, isEdit, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateLocomotive(initialData.id, values)
      : await createLocomotive(layoutId, values);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        isEdit
          ? "Locomotive updated"
          : `${values.road} #${values.number} added to roster`
      );
      setOpen(false);
      form.reset();
      router.refresh();
    }

    setIsLoading(false);
  }

  const hasSound = form.watch("hasSound");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative border-b bg-muted/30 px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)`,
              backgroundSize: "16px 16px",
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-lg tracking-wide">
              {isEdit
                ? `${initialData.road} #${initialData.number}`
                : "Add Locomotive"}
            </DialogTitle>
            <DialogDescription className="text-xs tracking-wider uppercase text-muted-foreground/70">
              {isEdit ? "Edit locomotive details" : "Add to locomotive roster"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Identity row: Road + Number + Model */}
              <div className="grid grid-cols-[1fr_100px_1fr] gap-3">
                <FormField
                  control={form.control}
                  name="road"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Railroad
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="UP"
                          className="h-10 uppercase transition-shadow duration-150 focus:shadow-md"
                          autoFocus
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
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234"
                          className="h-10 font-mono text-center tracking-wider transition-shadow duration-150 focus:shadow-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Model
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SD40-2"
                          className="h-10 transition-shadow duration-150 focus:shadow-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Type + Service + Status */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="locomotiveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locoTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Service
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Specs row */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="horsepower"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Horsepower
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="3000"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Length
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
                        Scale feet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="canPull"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Can Pull
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
                        Cars
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* DCC Section — collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDcc(!showDcc)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-wider font-medium">
                    DCC Configuration
                  </span>
                  <Separator className="flex-1" />
                  <span className="text-[10px]">
                    {showDcc ? "Hide" : "Show"}
                  </span>
                </button>

                <AnimatePresence>
                  {showDcc && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-4">
                        <div className="grid grid-cols-[100px_1fr_1fr] gap-3">
                          <FormField
                            control={form.control}
                            name="dccAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Address
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="3"
                                    className="h-10 font-mono text-center tracking-wider transition-shadow duration-150 focus:shadow-md"
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="decoderManufacturer"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Decoder Make
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Digitrax"
                                    className="h-10 transition-shadow duration-150 focus:shadow-md"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="decoderModel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Decoder Model
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="SDH166D"
                                    className="h-10 transition-shadow duration-150 focus:shadow-md"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Sound toggle */}
                        <FormField
                          control={form.control}
                          name="hasSound"
                          render={({ field }) => (
                            <FormItem>
                              <button
                                type="button"
                                onClick={() => field.onChange(!field.value)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded border text-sm
                                  transition-all duration-150 cursor-pointer w-full
                                  ${
                                    field.value
                                      ? "border-primary/40 bg-primary/5 text-primary"
                                      : "border-border/60 text-muted-foreground hover:border-border"
                                  }`}
                              >
                                {field.value ? (
                                  <Volume2 className="h-4 w-4" />
                                ) : (
                                  <VolumeOff className="h-4 w-4" />
                                )}
                                <span>
                                  Sound{" "}
                                  {field.value ? "Equipped" : "Not Equipped"}
                                </span>
                              </button>
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
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
                  className="min-w-[120px] transition-all duration-150"
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
                    "Add Locomotive"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
