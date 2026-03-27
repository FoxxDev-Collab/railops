"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { LoadStatus } from "@prisma/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, Trash2, RotateCcw, PackageCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { createWaybill, updateWaybill } from "@/app/actions/waybills";

// ─── Schema ───────────────────────────────────────────────────────────────────

const panelFormSchema = z.object({
  loadStatus: z.nativeEnum(LoadStatus),
  commodity: z.string().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  routeVia: z.string().optional().nullable(),
  originId: z.string().optional().nullable(),
  shipperIndustryId: z.string().optional().nullable(),
  destinationId: z.string().optional().nullable(),
  consigneeIndustryId: z.string().optional().nullable(),
});

const waybillFormSchema = z.object({
  freightCarId: z.string().optional().nullable(),
  isReturnable: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  panels: z.array(panelFormSchema).min(1).max(4),
});

type FormValues = z.infer<typeof waybillFormSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FreightCarOption {
  id: string;
  reportingMarks: string;
  number: string;
}

interface IndustryOption {
  id: string;
  name: string;
}

interface LocationOption {
  id: string;
  name: string;
  industries: IndustryOption[];
}

interface WaybillPanel {
  panelNumber: number;
  loadStatus: LoadStatus;
  commodity: string | null;
  weight: number | null;
  specialInstructions: string | null;
  routeVia: string | null;
  originId: string | null;
  shipperIndustryId: string | null;
  destinationId: string | null;
  consigneeIndustryId: string | null;
}

interface WaybillInitialData {
  id: string;
  isReturnable: boolean;
  notes: string | null;
  panels: WaybillPanel[];
  carCard: { freightCarId: string } | null;
}

interface WaybillFormProps {
  layoutId: string;
  initialData?: WaybillInitialData;
  backUrl: string;
  freightCars: FreightCarOption[];
  locations: LocationOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeNone(val: string | null | undefined): string | null {
  if (!val || val === "__none__") return null;
  return val;
}

// ─── Panel Section ────────────────────────────────────────────────────────────

function PanelSection({
  index,
  control,
  watch,
  locations,
  onRemove,
  canRemove,
}: {
  index: number;
  control: any;
  watch: any;
  locations: LocationOption[];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const originId = watch(`panels.${index}.originId`);
  const destinationId = watch(`panels.${index}.destinationId`);

  const originIndustries =
    locations.find((l) => l.id === originId)?.industries ?? [];
  const destinationIndustries =
    locations.find((l) => l.id === destinationId)?.industries ?? [];

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-4 space-y-4">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Panel {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors duration-150 cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      {/* Load status + commodity + weight */}
      <div className="grid grid-cols-[140px_1fr_90px] gap-3">
        <FormField
          control={control}
          name={`panels.${index}.loadStatus`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Load Status
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="LOADED">Loaded</SelectItem>
                  <SelectItem value="EMPTY">Empty</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`panels.${index}.commodity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Commodity
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Coal, Lumber, Grain"
                  className="h-9 transition-shadow duration-150 focus:shadow-md"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`panels.${index}.weight`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Weight
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="—"
                  className="h-9 text-center transition-shadow duration-150 focus:shadow-md"
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

      {/* Origin + shipper */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name={`panels.${index}.originId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Origin
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "__none__"}
              >
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`panels.${index}.shipperIndustryId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Shipper (Industry)
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "__none__"}
                disabled={originIndustries.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {originIndustries.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Destination + consignee */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name={`panels.${index}.destinationId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Destination
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "__none__"}
              >
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`panels.${index}.consigneeIndustryId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Consignee (Industry)
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "__none__"}
                disabled={destinationIndustries.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {destinationIndustries.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Route via + special instructions */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name={`panels.${index}.routeVia`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Route Via
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Yard A"
                  className="h-9 transition-shadow duration-150 focus:shadow-md"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`panels.${index}.specialInstructions`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Special Instructions
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Handle with care"
                  className="h-9 transition-shadow duration-150 focus:shadow-md"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function WaybillForm({
  layoutId,
  initialData,
  backUrl,
  freightCars,
  locations,
}: WaybillFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const defaultPanel: z.infer<typeof panelFormSchema> = {
    loadStatus: "EMPTY",
    commodity: null,
    weight: null,
    specialInstructions: null,
    routeVia: null,
    originId: null,
    shipperIndustryId: null,
    destinationId: null,
    consigneeIndustryId: null,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(waybillFormSchema) as any,
    defaultValues: {
      freightCarId: initialData?.carCard?.freightCarId ?? null,
      isReturnable: initialData?.isReturnable ?? true,
      notes: initialData?.notes ?? "",
      panels:
        initialData?.panels && initialData.panels.length > 0
          ? initialData.panels.map((p) => ({
              loadStatus: p.loadStatus,
              commodity: p.commodity,
              weight: p.weight,
              specialInstructions: p.specialInstructions,
              routeVia: p.routeVia,
              originId: p.originId,
              shipperIndustryId: p.shipperIndustryId,
              destinationId: p.destinationId,
              consigneeIndustryId: p.consigneeIndustryId,
            }))
          : [defaultPanel],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "panels",
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const normalizedPanels = values.panels.map((p, i) => ({
      ...p,
      panelNumber: i + 1,
      originId: normalizeNone(p.originId),
      shipperIndustryId: normalizeNone(p.shipperIndustryId),
      destinationId: normalizeNone(p.destinationId),
      consigneeIndustryId: normalizeNone(p.consigneeIndustryId),
    }));

    const payload = {
      freightCarId: normalizeNone(values.freightCarId),
      isReturnable: values.isReturnable,
      notes: values.notes || null,
      panels: normalizedPanels,
    };

    const result = isEdit
      ? await updateWaybill(initialData.id, layoutId, payload)
      : await createWaybill(layoutId, payload);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success(isEdit ? "Waybill updated" : "Waybill created");
      router.push(backUrl);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link + page title */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Waybills
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? "Edit Waybill" : "Create Waybill"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update routing and panel details."
            : "Route a freight car between locations on your railroad."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Car Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Car Assignment</CardTitle>
              <CardDescription>
                Link this waybill to a specific freight car.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="freightCarId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Assigned Car
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 font-mono">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— Unassigned —</SelectItem>
                        {freightCars.map((car) => (
                          <SelectItem key={car.id} value={car.id}>
                            <span className="font-mono tracking-wide">
                              {car.reportingMarks} {car.number}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Returnable toggle */}
              <FormField
                control={form.control}
                name="isReturnable"
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
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <PackageCheck className="h-4 w-4" />
                      )}
                      <span>
                        {field.value
                          ? "Returnable — car returns empty after delivery"
                          : "Non-returnable — one-way movement"}
                      </span>
                    </button>
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes about this waybill…"
                        className="resize-none text-sm transition-shadow duration-150 focus:shadow-md"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          </div>

          {/* Panel 1 — always shown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Panel 1</CardTitle>
              <CardDescription>
                The primary routing leg for this waybill.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PanelSection
                index={0}
                control={form.control}
                watch={form.watch}
                locations={locations}
                onRemove={() => remove(0)}
                canRemove={false}
              />
            </CardContent>
          </Card>

          {/* Additional Panels (2-4) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Additional Panels</CardTitle>
                  <CardDescription className="mt-1">
                    Add up to 3 more routing legs. ({fields.length} of 4 panels
                    total)
                  </CardDescription>
                </div>
                {fields.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append(defaultPanel)}
                    className="shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Panel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {fields.slice(1).map((field, sliceIndex) => {
                  const index = sliceIndex + 1;
                  return (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <PanelSection
                        index={index}
                        control={form.control}
                        watch={form.watch}
                        locations={locations}
                        onRemove={() => remove(index)}
                        canRemove={true}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {fields.length === 1 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No additional panels. Click "Add Panel" to add a second leg.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" asChild>
              <Link href={backUrl}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[140px] transition-all duration-150"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Waybill"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
