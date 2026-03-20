"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TrainClass, TrainServiceType } from "@prisma/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Power, PowerOff } from "lucide-react";
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

interface TrainFormDialogProps {
  layoutId: string;
  locations: Location[];
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
  trigger: React.ReactNode;
}

export function TrainFormDialog({
  layoutId,
  locations,
  initialData,
  trigger,
}: TrainFormDialogProps) {
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (open && !isEdit) form.reset();
  }, [open, isEdit, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateTrain(initialData.id, values)
      : await createTrain(layoutId, values);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        isEdit ? "Train updated" : `Train ${values.trainNumber} created`
      );
      setOpen(false);
      form.reset();
      router.refresh();
    }

    setIsLoading(false);
  }

  const isActive = form.watch("isActive");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative border-b bg-muted/30 px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 5px,
                currentColor 5px,
                currentColor 6px
              )`,
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-lg tracking-wide">
              {isEdit
                ? `Train ${initialData.trainNumber}`
                : "Create Train"}
            </DialogTitle>
            <DialogDescription className="text-xs tracking-wider uppercase text-muted-foreground/70">
              {isEdit
                ? "Edit train configuration"
                : "Define a new train service"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
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
                        className="resize-none min-h-[60px] transition-shadow duration-150 focus:shadow-md"
                        rows={2}
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
                    "Create Train"
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
