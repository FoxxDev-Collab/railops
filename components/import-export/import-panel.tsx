"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Loader2,
  CheckCircle2,
  Download,
  AlertCircle,
} from "lucide-react";
import { previewImport, confirmImport } from "@/app/actions/csv-import";
import type { PreviewResult } from "@/app/actions/csv-import";
import { ImportPreviewTable } from "./import-preview-table";
import {
  type ResourceType,
  resourceTypeLabels,
  getTemplateHeaders,
} from "@/lib/csv/columns";
import { triggerDownload } from "./csv-trigger-download";

const allTypes: ResourceType[] = [
  "locations",
  "industries",
  "locomotives",
  "freightCars",
  "passengerCars",
  "cabooses",
  "mowEquipment",
  "trains",
];

interface ImportPanelProps {
  layoutId: string;
}

export function ImportPanel({ layoutId }: ImportPanelProps) {
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);

      if (resourceType) {
        startTransition(async () => {
          const result = await previewImport(resourceType, text);
          setPreview(result);
        });
      }
    };
    reader.readAsText(file);
  }

  function handlePreview() {
    if (!resourceType || !csvContent) return;
    startTransition(async () => {
      const result = await previewImport(resourceType, csvContent);
      setPreview(result);
    });
  }

  function handleConfirm() {
    if (!resourceType || !csvContent) return;
    startTransition(async () => {
      const result = await confirmImport(layoutId, resourceType, csvContent);
      setImportResult(result);
      setPreview(null);
    });
  }

  function handleReset() {
    setCsvContent(null);
    setFileName(null);
    setPreview(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDownloadTemplate() {
    if (!resourceType) return;
    const template = getTemplateHeaders(resourceType);
    triggerDownload(template, `railroadops-${resourceType}-template.csv`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Import Data</h3>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk-import records. Invalid rows will be
          highlighted and skipped.
        </p>
      </div>

      {/* Step 1: Select type */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Resource Type</label>
        <div className="flex items-center gap-3">
          <Select
            value={resourceType ?? undefined}
            onValueChange={(v) => {
              setResourceType(v as ResourceType);
              setPreview(null);
              setImportResult(null);
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {allTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {resourceTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resourceType && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download Template
            </Button>
          )}
        </div>
      </div>

      {/* Step 2: Upload file */}
      {resourceType && (
        <div className="space-y-3">
          <label className="text-sm font-medium">CSV File</label>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
              <Upload className="h-4 w-4" />
              {fileName ?? "Choose file..."}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {csvContent && !preview && (
              <Button onClick={handlePreview} disabled={isPending} size="sm">
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Preview
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {preview && (
        <div className="space-y-4">
          <ImportPreviewTable
            headers={preview.headers}
            validRows={preview.validRows}
            invalidRows={preview.invalidRows}
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isPending || preview.validRows.length === 0}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Import {preview.validRows.length} Row
              {preview.validRows.length !== 1 ? "s" : ""}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Result */}
      {importResult && (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">
                Successfully imported {importResult.created} record
                {importResult.created !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                {importResult.errors.length} error
                {importResult.errors.length !== 1 ? "s" : ""} during creation
              </div>
              <ul className="text-xs text-destructive/80 space-y-0.5">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" onClick={handleReset}>
            Import More
          </Button>
        </div>
      )}
    </div>
  );
}
