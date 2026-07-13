export type ParsedWorkbookSheet = {
  name: string;
  rows: unknown[][];
};

export async function readXlsxWorkbook(file: File): Promise<ParsedWorkbookSheet[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      blankrows: true,
      defval: "",
      raw: true
    })
  }));
}
