"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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

interface IndustryFormProps {
  locationId: string;
  locationName: string;
  layoutId: string;
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
  backUrl: string;
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
          className="transition-shadow duration-150 focus:shadow-md"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCommodity}
          className="shrink-0"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
                aria-label={`Remove ${commodity}`}
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

export function IndustryForm({
  locationId,
  locationName,
  initialData,
  backUrl,
}: IndustryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    // @ts-expect-error zodResolver typing mismatch with zod v4
    resolver: zodResolver(industrySchema),
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

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateIndustry(initialData.id, values)
      : await createIndustry(locationId, values);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success(isEdit ? "Industry updated" : "Industry added");
      router.push(backUrl);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href={backUrl}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isEdit ? `Edit ${initialData.name}` : "Add Industry"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {locationName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Manufacturing"
                          autoFocus
                          className="transition-shadow duration-150 focus:shadow-md"
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
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="transition-shadow duration-150 focus:shadow-md">
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Switching instructions, special handling notes..."
                        className="resize-none transition-shadow duration-150 focus:shadow-md"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Capacity */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Capacity
              </CardTitle>
              <CardDescription className="text-xs">
                Physical constraints for car spotting operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="spotCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Car Spots</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="—"
                          className="text-center transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-center">
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
                      <FormLabel>Track Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="—"
                          className="text-center transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-center">
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
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="—"
                          className="text-center transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-center">
                        Tons
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          </div>

          {/* Commodities */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Commodities
              </CardTitle>
              <CardDescription className="text-xs">
                Press Enter or click Add to add each commodity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="commoditiesIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receives (Inbound)</FormLabel>
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
                      <FormLabel>Ships (Outbound)</FormLabel>
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
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href={backUrl}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px] transition-all duration-150"
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
                "Add Industry"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
