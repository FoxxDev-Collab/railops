"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RollingStockStatus, PassengerCarType, ClassOfService } from "@prisma/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SilhouettePicker } from "@/components/ui/silhouette-picker";
import { createPassengerCar, updatePassengerCar } from "@/app/actions/passenger-cars";

const passengerCarSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Car number required"),
  carName: z.string().optional().nullable(),
  carType: z.nativeEnum(PassengerCarType),
  seats: z.coerce.number().optional().nullable(),
  berths: z.coerce.number().optional().nullable(),
  classOfService: z.nativeEnum(ClassOfService).optional(),
  length: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  silhouetteId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof passengerCarSchema>;

const carTypeOptions: { value: PassengerCarType; label: string }[] = [
  { value: "COACH", label: "Coach" },
  { value: "SLEEPER", label: "Sleeper" },
  { value: "DINER", label: "Diner" },
  { value: "LOUNGE", label: "Lounge" },
  { value: "BAGGAGE", label: "Baggage" },
  { value: "RPO", label: "RPO" },
  { value: "COMBINE", label: "Combine" },
  { value: "OBSERVATION", label: "Observation" },
];

const classOfServiceOptions: { value: ClassOfService; label: string }[] = [
  { value: "FIRST", label: "First Class" },
  { value: "BUSINESS", label: "Business" },
  { value: "COACH", label: "Coach" },
];

const statusOptions: { value: RollingStockStatus; label: string }[] = [
  { value: "SERVICEABLE", label: "Serviceable" },
  { value: "BAD_ORDER", label: "Bad Order" },
  { value: "STORED", label: "Stored" },
  { value: "RETIRED", label: "Retired" },
];

interface PassengerCarFormProps {
  layoutId: string;
  initialData?: {
    id: string;
    reportingMarks: string;
    number: string;
    carName: string | null;
    carType: PassengerCarType;
    seats: number | null;
    berths: number | null;
    classOfService: ClassOfService;
    length: number | null;
    status: RollingStockStatus;
    silhouetteId?: string | null;
  };
  backUrl: string;
}

export function PassengerCarForm({
  layoutId,
  initialData,
  backUrl,
}: PassengerCarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(passengerCarSchema),
    defaultValues: {
      reportingMarks: initialData?.reportingMarks ?? "",
      number: initialData?.number ?? "",
      carName: initialData?.carName ?? "",
      carType: initialData?.carType ?? "COACH",
      seats: initialData?.seats ?? null,
      berths: initialData?.berths ?? null,
      classOfService: initialData?.classOfService ?? "COACH",
      length: initialData?.length ?? null,
      status: initialData?.status ?? "SERVICEABLE",
      silhouetteId: initialData?.silhouetteId ?? null,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updatePassengerCar(initialData.id, values)
      : await createPassengerCar(layoutId, values);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success(
        isEdit
          ? "Passenger car updated"
          : `${values.reportingMarks} ${values.number} added`
      );
      router.push(backUrl);
    }
  }

  const watchedCarType = form.watch("carType");
  const isSleeper = watchedCarType === "SLEEPER";

  return (
    <div className="space-y-6">
      {/* Back link + page title */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Passenger Cars
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit
            ? `Edit: ${initialData.reportingMarks} ${initialData.number}`
            : "Add Passenger Car"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update passenger car details."
            : "Add a new passenger car to your inventory."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Silhouette</CardTitle>
              <CardDescription>Choose a silhouette that matches your passenger car</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="silhouetteId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <SilhouettePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Car Identity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Car Identity</CardTitle>
              <CardDescription>
                Reporting marks, number, name, and type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Reporting Marks + Number */}
              <div className="grid grid-cols-[1fr_100px] gap-3">
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
                          placeholder="AMTK"
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
                          placeholder="1001"
                          className="h-10 font-mono text-center tracking-wider transition-shadow duration-150 focus:shadow-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Car Name */}
              <FormField
                control={form.control}
                name="carName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Car Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Silver Meteor"
                        className="h-10 transition-shadow duration-150 focus:shadow-md"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Car Type */}
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
                        {carTypeOptions.map((t) => (
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
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>
                Service class, capacity, and status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Class of Service + Status */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="classOfService"
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
                          {classOfServiceOptions.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
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
                  name="seats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Seats
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
                        Capacity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isSleeper && (
                  <FormField
                    control={form.control}
                    name="berths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                          Berths
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
                          Sleeping
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
              </div>
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
                "Add Passenger Car"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
