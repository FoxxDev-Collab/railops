export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export function toCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeField(c.header)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = col.accessor(row);
          if (val === null || val === undefined) return "";
          return escapeField(String(val));
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
