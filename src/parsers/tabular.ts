import { load } from "cheerio";
import * as XLSX from "xlsx";

export function tabularCells(format: "xlsx" | "csv", data: Uint8Array): string[][] {
  const workbook = XLSX.read(data, { type: "array", raw: false });
  return workbook.SheetNames.flatMap((name) => sheetCells(workbook.Sheets[name]));
}

export function htmlTableCells(data: Uint8Array): string[][] {
  const $ = load(new TextDecoder().decode(data));
  return $("tr").toArray().map((row) => $(row).find("th, td").toArray()
    .map((cell) => $(cell).text().replace(/\s+/g, " ").trim()));
}

function sheetCells(sheet: XLSX.WorkSheet): string[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" })
    .map((row) => row.map((cell) => String(cell)));
}
