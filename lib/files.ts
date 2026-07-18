import * as XLSX from "xlsx";

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export function isSpreadsheet(file: File): boolean {
  const name = file.name.toLowerCase();
  return SPREADSHEET_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Converts an Excel/CSV file to a CSV-text File so it can be sent to the
 * extraction API as plain text (Claude's document API only accepts PDFs). */
export async function toCsvFile(file: File): Promise<File> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(firstSheet);
  return new File([csv], file.name.replace(/\.(xlsx|xls)$/i, ".csv"), { type: "text/csv" });
}
