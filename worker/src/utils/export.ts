export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const keys = columns || Object.keys(rows[0]);
  const header = keys.join(",");
  const lines = rows.map(row =>
    keys.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}
