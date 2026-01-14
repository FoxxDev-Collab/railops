"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLayout, updateLayout } from "@/app/actions/layouts";

const layoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  scale: z.string().optional(),
  imageUrl: z.string().optional(),
});

interface LayoutFormProps {
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    scale?: string | null;
    imageUrl?: string | null;
  };
}

export function LayoutForm({ initialData }: LayoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<z.infer<typeof layoutSchema>>({
    resolver: zodResolver(layoutSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      scale: initialData?.scale || "",
      imageUrl: initialData?.imageUrl || "",
    },
  });

  async function onSubmit(values: z.infer<typeof layoutSchema>) {
    setIsLoading(true);

    const result = isEdit
      ? await updateLayout(initialData.id, values)
      : await createLayout(values);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Layout updated" : "Layout created");
      router.push("/dashboard/layouts");
      router.refresh();
    }

    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Layout" : "New Layout"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Railroad Layout" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your layout a descriptive name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scale</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a scale" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Z">Z Scale (1:220)</SelectItem>
                      <SelectItem value="N">N Scale (1:160)</SelectItem>
                      <SelectItem value="TT">TT Scale (1:120)</SelectItem>
                      <SelectItem value="HO">HO Scale (1:87)</SelectItem>
                      <SelectItem value="S">S Scale (1:64)</SelectItem>
                      <SelectItem value="O">O Scale (1:48)</SelectItem>
                      <SelectItem value="G">G Scale (1:22.5)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your layout..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                    ? "Update Layout"
                    : "Create Layout"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/layouts")}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
