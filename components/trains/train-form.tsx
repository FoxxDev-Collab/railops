"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TrainClass, TrainServiceType } from "@prisma/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Power, PowerOff } from "lucide-react";
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
import { createTrain, updateTrain } from "@/app/actions/trains";

const trainSchema = z.object({
  trainNumber: z.string().min(1, "Train number is required"),
  trainName: z.string().optional().nullable(),
  trainClass: z.nativeEnum(TrainClass),
  serviceType: z.nativeEnum(TrainServiceType),
  departureTime: z.string().optional().nullable(),
  symbol: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  originId: z.string().optional().nullable(),
  destinationId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof trainSchema>;

const trainClasses: { value: TrainClass; label: string }[] = [
  { value: "MANIFEST", label: "Manifest" },
  { value: "UNIT", label: "Unit Train" },
  { value: "INTERMODAL", label: "Intermodal" },
  { value: "LOCAL", label: "Local" },
  { value: "PASSENGER", label: "Passenger" },
  { value: "WORK", label: "Work Train" },
  { value: "LIGHT_ENGINE", label: "Light Engine" },
];

const serviceTypes: { value: TrainServiceType; label: string }[] = [
  { value: "FREIGHT", label: "Freight" },
  { value: "PASSENGER", label: "Passenger" },
  { value: "MIXED", label: "Mixed" },
  { value: "MOW", label: "Maintenance of Way" },
];

interface Location {
  id: string;
  name: string;
  code: string;
}

interface TrainFormProps {
  layoutId: string;
  locations: Location[];
  backUrl: string;
  initialData?: {
    id: string;
    trainNumber: string;
    trainName: string | null;
    trainClass: TrainClass;
    serviceType: TrainServiceType;
    departureTime: string | null;
    symbol: string | null;
    description: string | null;
    originId: string | null;
    destinationId: string | null;
    isActive: boolean;
  };
}

export function TrainForm({
  layoutId,
  locations,
  backUrl,
  initialData,
}: TrainFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(trainSchema) as any,
    defaultValues: {
      trainNumber: initialData?.trainNumber ?? "",
      trainName: initialData?.trainName ?? "",
      trainClass: initialData?.trainClass ?? "MANIFEST",
      serviceType: initialData?.serviceType ?? "FREIGHT",
      departureTime: initialData?.departureTime ?? "",
      symbol: initialData?.symbol ?? "",
      description: initialData?.description ?? "",
      originId: initialData?.originId ?? null,
      destinationId: initialData?.destinationId ?? null,
      isActive: initialData?.isActive ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateTrain(initialData.id, values)
      : await createTrain(layoutId, values);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success(
        isEdit ? "Train updated" : `Train ${values.trainNumber} created`
      );
      router.push(backUrl);
    }
  }

  const isActive = form.watch("isActive");

  return (
    <div className="space-y-6">
      {/* Back link + page title */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Trains
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit
            ? `Edit Train ${initialData.trainNumber}`
            : "Create Train"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update train service details and schedule."
            : "Define a new train service for your railroad."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Train Identity</CardTitle>
              <CardDescription>
                Number, name, symbol, and classification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Number + Name + Symbol */}
              <div className="grid grid-cols-[100px_1fr_100px] gap-3">
                <FormField
                  control={form.control}
                  name="trainNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="101"
                          className="h-10 font-mono text-center tracking-wider transition-shadow duration-150 focus:shadow-md"
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
                  name="trainName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="The Flyer"
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
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Symbol
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MALA"
                          className="h-10 font-mono text-center uppercase tracking-wider transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? ""}
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

              {/* Class + Service + Departure */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="trainClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Class
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
                          {trainClasses.map((t) => (
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
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Departs
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="h-10 text-center font-mono transition-shadow duration-150 focus:shadow-md"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Route Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route</CardTitle>
              <CardDescription>
                Origin, destination, and operating notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Origin + Destination */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="originId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Origin
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? null : v)
                        }
                        defaultValue={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select origin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">None</span>
                          </SelectItem>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {loc.code}
                                </span>
                                {loc.name}
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
                  name="destinationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Destination
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? null : v)
                        }
                        defaultValue={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">None</span>
                          </SelectItem>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {loc.code}
                                </span>
                                {loc.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        placeholder="Switching instructions, routing notes..."
                        className="resize-none min-h-[80px] transition-shadow duration-150 focus:shadow-md"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active toggle */}
              <FormField
                control={form.control}
                name="isActive"
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
                        <Power className="h-4 w-4" />
                      ) : (
                        <PowerOff className="h-4 w-4" />
                      )}
                      <span>
                        Train is {field.value ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          </div>

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
                "Create Train"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
