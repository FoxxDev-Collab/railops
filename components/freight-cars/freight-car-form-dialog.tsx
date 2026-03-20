"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RollingStockStatus } from "@prisma/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import { X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { createFreightCar, updateFreightCar } from "@/app/actions/freight-cars";

const freightCarSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Car number required"),
  carType: z.string().min(1, "Car type required"),
  aarTypeCode: z.string().optional().nullable(),
  subtype: z.string().optional().nullable(),
  length: z.coerce.number().optional().nullable(),
  capacity: z.coerce.number().int().optional().nullable(),
  homeRoad: z.string().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  commodities: z.array(z.string()).optional(),
  currentLocationId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof freightCarSchema>;

const carTypes = [
  { value: "Boxcar", aar: "XM" },
  { value: "Refrigerator", aar: "RS" },
  { value: "Covered Hopper", aar: "LO" },
  { value: "Open Hopper", aar: "HT" },
  { value: "Tank Car", aar: "TM" },
  { value: "Flat Car", aar: "FM" },
  { value: "Gondola", aar: "GB" },
  { value: "Stock Car", aar: "SM" },
  { value: "Autorack", aar: "RA" },
  { value: "Intermodal", aar: "QT" },
  { value: "Bulkhead Flat", aar: "FB" },
  { value: "Center Beam", aar: "FC" },
  { value: "Coil Car", aar: "GS" },
];

const statusOptions: { value: RollingStockStatus; label: string }[] = [
  { value: "SERVICEABLE", label: "Serviceable" },
  { value: "BAD_ORDER", label: "Bad Order" },
  { value: "STORED", label: "Stored" },
  { value: "RETIRED", label: "Retired" },
];

interface FreightCarFormDialogProps {
  layoutId: string;
  initialData?: {
    id: string;
    reportingMarks: string;
    number: string;
    carType: string;
    aarTypeCode: string | null;
    subtype: string | null;
    length: number | null;
    capacity: number | null;
    homeRoad: string | null;
    status: RollingStockStatus;
    commodities: string[];
    currentLocationId: string | null;
  };
  trigger: React.ReactNode;
}

function CommodityInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (val: string[]) => void;
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
          placeholder="e.g. Lumber, Coal"
          className="h-8 text-sm transition-shadow duration-150 focus:shadow-md"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="h-8 px-3 text-xs shrink-0"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 pr-1 text-xs">
              {c}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== c))}
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

export function FreightCarFormDialog({
  layoutId,
  initialData,
  trigger,
}: FreightCarFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(freightCarSchema) as any,
    defaultValues: {
      reportingMarks: initialData?.reportingMarks ?? "",
      number: initialData?.number ?? "",
      carType: initialData?.carType ?? "",
      aarTypeCode: initialData?.aarTypeCode ?? "",
      subtype: initialData?.subtype ?? "",
      length: initialData?.length ?? null,
      capacity: initialData?.capacity ?? null,
      homeRoad: initialData?.homeRoad ?? "",
      status: initialData?.status ?? "SERVICEABLE",
      commodities: initialData?.commodities ?? [],
      currentLocationId: initialData?.currentLocationId ?? null,
    },
  });

  useEffect(() => {
    if (open && !isEdit) form.reset();
  }, [open, isEdit, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateFreightCar(initialData.id, values)
      : await createFreightCar(layoutId, values);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        isEdit
          ? "Freight car updated"
          : `${values.reportingMarks} ${values.number} added`
      );
      setOpen(false);
      form.reset();
      router.refresh();
    }

    setIsLoading(false);
  }

  // Auto-fill AAR code when car type changes
  const watchedType = form.watch("carType");
  useEffect(() => {
    const match = carTypes.find((t) => t.value === watchedType);
    if (match && !isEdit) {
      form.setValue("aarTypeCode", match.aar);
    }
  }, [watchedType, form, isEdit]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative border-b bg-muted/30 px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 7px,
                currentColor 7px,
                currentColor 8px
              )`,
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-lg tracking-wide">
              {isEdit
                ? `${initialData.reportingMarks} ${initialData.number}`
                : "Add Freight Car"}
            </DialogTitle>
            <DialogDescription className="text-xs tracking-wider uppercase text-muted-foreground/70">
              {isEdit ? "Edit car details" : "Add to car inventory"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Reporting Marks + Number + Home Road */}
              <div className="grid grid-cols-[1fr_100px_1fr] gap-3">
                <FormField
                  control={form.control}
                  name="reportingMarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Reporting Marks
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ATSF"
                          className="h-10 uppercase font-mono tracking-wider transition-shadow duration-150 focus:shadow-md"
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
                          placeholder="12345"
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
                  name="homeRoad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Home Road
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ATSF"
                          className="h-10 uppercase transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Car Type + AAR + Status */}
              <div className="grid grid-cols-[1fr_80px_1fr] gap-3">
                <FormField
                  control={form.control}
                  name="carType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Car Type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {carTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="flex items-center gap-2">
                                {t.value}
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {t.aar}
                                </span>
                              </span>
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
                  name="aarTypeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        AAR
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="XM"
                          className="h-10 font-mono text-center uppercase tracking-widest transition-shadow duration-150 focus:shadow-md"
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
              <div className="grid grid-cols-2 gap-3">
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
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Capacity
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
                        Tons
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Commodities */}
              <FormField
                control={form.control}
                name="commodities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Commodities This Car Can Carry
                    </FormLabel>
                    <CommodityInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    "Add Car"
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
