"use client";

import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ValidatedRow } from "@/lib/csv/validate";

interface ImportPreviewTableProps {
  headers: string[];
  validRows: ValidatedRow[];
  invalidRows: ValidatedRow[];
}

export function ImportPreviewTable({
  headers,
  validRows,
  invalidRows,
}: ImportPreviewTableProps) {
  const allRows = [...invalidRows, ...validRows].sort(
    (a, b) => a.rowIndex - b.rowIndex
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium">{validRows.length}</span>
          <span className="text-muted-foreground">valid</span>
        </div>
        {invalidRows.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="font-medium">{invalidRows.length}</span>
            <span className="text-muted-foreground">
              error{invalidRows.length !== 1 ? "s" : ""} (will be skipped)
            </span>
          </div>
        )}
      </div>

      <div className="max-h-[400px] overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-[60px]">
                Row
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-[70px]">
                Status
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {allRows.map((row) => (
              <Fragment key={row.rowIndex}>
                <tr
                  className={
                    row.valid
                      ? ""
                      : "bg-destructive/5"
                  }
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.rowIndex + 2}
                  </td>
                  <td className="px-3 py-2">
                    {row.valid ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4"
                      >
                        OK
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-destructive/50 bg-destructive/10 text-destructive text-[10px] px-1.5 py-0 h-4"
                      >
                        Error
                      </Badge>
                    )}
                  </td>
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-xs max-w-[150px] truncate">
                      {String((row.data as Record<string, unknown>)[h] ?? "")}
                    </td>
                  ))}
                </tr>
                {!row.valid && (
                  <tr className="bg-destructive/5">
                    <td
                      colSpan={headers.length + 2}
                      className="px-3 py-1 text-xs text-destructive"
                    >
                      {row.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
