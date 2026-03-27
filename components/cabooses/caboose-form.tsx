"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CabooseType, RollingStockStatus } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
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
import { createCaboose, updateCaboose } from "@/app/actions/cabooses";

const cabooseSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Car number required"),
  cabooseType: z.nativeEnum(CabooseType),
  road: z.string().optional().nullable(),
  length: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
});

type FormValues = z.infer<typeof cabooseSchema>;

const cabooseTypes: { value: CabooseType; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "EXTENDED_VISION", label: "Extended Vision" },
  { value: "BAY_WINDOW", label: "Bay Window" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "BOBBER", label: "Bobber" },
];

const statusOptions: { value: RollingStockStatus; label: string }[] = [
  { value: "SERVICEABLE", label: "Serviceable" },
  { value: "BAD_ORDER", label: "Bad Order" },
  { value: "STORED", label: "Stored" },
  { value: "RETIRED", label: "Retired" },
];

interface CabooseFormProps {
  layoutId: string;
  initialData?: {
    id: string;
    reportingMarks: string;
    number: string;
    cabooseType: CabooseType;
    road: string | null;
    length: number | null;
    status: RollingStockStatus;
  };
  backUrl: string;
}

export function CabooseForm({
  layoutId,
  initialData,
  backUrl,
}: CabooseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    // @ts-expect-error zodResolver typing mismatch with zod v4
    resolver: zodResolver(cabooseSchema),
    defaultValues: {
      reportingMarks: initialData?.reportingMarks ?? "",
      number: initialData?.number ?? "",
      cabooseType: initialData?.cabooseType ?? "STANDARD",
      road: initialData?.road ?? "",
      length: initialData?.length ?? null,
      status: initialData?.status ?? "SERVICEABLE",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateCaboose(initialData.id, values)
      : await createCaboose(layoutId, values);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success(
        isEdit
          ? "Caboose updated"
          : `${values.reportingMarks} ${values.number} added`
      );
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
          Back to Cabooses
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit
            ? `Edit: ${initialData.reportingMarks} ${initialData.number}`
            : "Add Caboose"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update caboose details and operational status."
            : "Add a new caboose to your car inventory."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
              <CardDescription>
                Reporting marks, number, and road.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                          placeholder="999"
                          className="h-10 font-mono text-center tracking-wider transition-shadow duration-150 focus:shadow-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="road"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Road
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
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>
                Type, status, and specifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="cabooseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Caboose Type
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
                        {cabooseTypes.map((t) => (
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
                "Add Caboose"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
