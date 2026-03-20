"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createIndustry, updateIndustry } from "@/app/actions/locations";

const industrySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  capacity: z.coerce.number().int().optional().nullable(),
  spotCount: z.coerce.number().int().optional().nullable(),
  trackLength: z.coerce.number().optional().nullable(),
  description: z.string().optional(),
  commoditiesIn: z.array(z.string()).optional(),
  commoditiesOut: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof industrySchema>;

const industryTypes = [
  "Manufacturer",
  "Warehouse",
  "Coal Mine",
  "Grain Elevator",
  "Lumber Mill",
  "Oil Refinery",
  "Chemical Plant",
  "Steel Mill",
  "Power Plant",
  "Freight House",
  "Team Track",
  "Cold Storage",
  "Brewery",
  "Quarry",
  "Cement Plant",
  "Paper Mill",
  "Auto Plant",
  "Scrap Yard",
  "Feed Mill",
  "Stockyard",
  "Other",
];

interface IndustryFormDialogProps {
  locationId: string;
  locationName: string;
  initialData?: {
    id: string;
    name: string;
    type: string;
    capacity?: number | null;
    spotCount?: number | null;
    trackLength?: number | null;
    description?: string | null;
    commoditiesIn: string[];
    commoditiesOut: string[];
  };
  trigger: React.ReactNode;
}

function CommodityInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addCommodity() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  }

  function removeCommodity(commodity: string) {
    onChange(value.filter((c) => c !== commodity));
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
              addCommodity();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm transition-shadow duration-150 focus:shadow-md"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCommodity}
          className="h-8 px-3 text-xs shrink-0"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((commodity) => (
            <Badge
              key={commodity}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {commodity}
              <button
                type="button"
                onClick={() => removeCommodity(commodity)}
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

export function IndustryFormDialog({
  locationId,
  locationName,
  initialData,
  trigger,
}: IndustryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(industrySchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      type: initialData?.type ?? "",
      capacity: initialData?.capacity ?? null,
      spotCount: initialData?.spotCount ?? null,
      trackLength: initialData?.trackLength ?? null,
      description: initialData?.description ?? "",
      commoditiesIn: initialData?.commoditiesIn ?? [],
      commoditiesOut: initialData?.commoditiesOut ?? [],
    },
  });

  useEffect(() => {
    if (open && !isEdit) form.reset();
  }, [open, isEdit, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateIndustry(initialData.id, values)
      : await createIndustry(locationId, values);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Industry updated" : "Industry added");
      setOpen(false);
      form.reset();
      router.refresh();
    }

    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="relative border-b bg-muted/30 px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 11px,
                currentColor 11px,
                currentColor 12px
              )`,
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-lg tracking-wide">
              {isEdit ? `Edit ${initialData.name}` : "Add Industry"}
            </DialogTitle>
            <DialogDescription className="text-xs tracking-wider uppercase text-muted-foreground/70">
              {locationName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Name + Type row */}
              <div className="grid grid-cols-2 gap-3">
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
                          placeholder="Acme Manufacturing"
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
                  name="type"
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
                          <SelectTrigger className="h-10 transition-shadow duration-150 focus:shadow-md">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industryTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Capacity details */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="spotCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Car Spots
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
                        Spots for cars
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trackLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Track Length
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
                        Feet
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="commoditiesIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Receives (Inbound)
                      </FormLabel>
                      <CommodityInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="e.g. Coal"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commoditiesOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Ships (Outbound)
                      </FormLabel>
                      <CommodityInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="e.g. Steel"
                      />
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
                      Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Switching instructions, special handling notes..."
                        className="resize-none min-h-[60px] transition-shadow duration-150 focus:shadow-md"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
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
                    "Add Industry"
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
