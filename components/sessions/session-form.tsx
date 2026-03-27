"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { createSession, updateSession } from "@/app/actions/sessions";

const sessionSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional().nullable(),
  trainIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof sessionSchema>;

interface Train {
  id: string;
  trainNumber: string;
  trainName: string | null;
}

interface SessionFormProps {
  layoutId: string;
  initialData?: {
    id: string;
    name: string;
    date: Date;
    notes: string | null;
    sessionTrains: {
      train: { id: string; trainNumber: string; trainName: string | null };
    }[];
  };
  backUrl: string;
  trains: Train[];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function SessionForm({
  layoutId,
  initialData,
  backUrl,
  trains,
}: SessionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const defaultTrainIds = initialData
    ? initialData.sessionTrains.map((st) => st.train.id)
    : [];

  const form = useForm<FormValues>({
    // @ts-expect-error zodResolver typing mismatch with zod v4
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      date: initialData
        ? new Date(initialData.date).toISOString().split("T")[0]
        : todayIso(),
      notes: initialData?.notes ?? "",
      trainIds: defaultTrainIds,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const result = isEdit
      ? await updateSession(initialData.id, layoutId, values)
      : await createSession(layoutId, values);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success(isEdit ? "Session updated" : `"${values.name}" created`);
      router.push(backUrl);
    }
  }

  const selectedTrainIds = form.watch("trainIds") ?? [];

  function toggleTrain(trainId: string) {
    const current = form.getValues("trainIds") ?? [];
    const next = current.includes(trainId)
      ? current.filter((id) => id !== trainId)
      : [...current, trainId];
    form.setValue("trainIds", next);
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
          Back to Sessions
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? `Edit: ${initialData.name}` : "New Operating Session"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update session details and train assignments."
            : "Schedule a new operating session and assign trains."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Details</CardTitle>
              <CardDescription>Name, date, and optional notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Session Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Summer Ops Night"
                        autoFocus
                        className="h-10 transition-shadow duration-150 focus:shadow-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10 transition-shadow duration-150 focus:shadow-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                        placeholder="Optional session notes..."
                        rows={3}
                        className="resize-none transition-shadow duration-150 focus:shadow-md"
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

          {/* Train Assignment Card */}
          {trains.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Train Assignment</CardTitle>
                <CardDescription>
                  Select the trains that will operate in this session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="trainIds"
                  render={() => (
                    <FormItem>
                      <div className="rounded-md border bg-muted/20 divide-y divide-border/50">
                        {trains.map((train) => (
                          <label
                            key={train.id}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors duration-100"
                          >
                            <Checkbox
                              checked={selectedTrainIds.includes(train.id)}
                              onCheckedChange={() => toggleTrain(train.id)}
                              className="shrink-0"
                            />
                            <span className="flex items-center gap-2 text-sm">
                              <span className="font-mono font-medium text-xs tracking-wider text-muted-foreground">
                                {train.trainNumber}
                              </span>
                              {train.trainName && (
                                <span className="text-foreground">
                                  {train.trainName}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ) : <div />}
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
                "Create Session"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
