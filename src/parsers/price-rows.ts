import type { OfficialPriceRow, SourceDocument } from "../types.js";

const OFFICIAL_CODE = /^(?:\d{2}(?:\.\d{3}){2,4}|\d{2}(?:\.\d{3})+\.\d{4})$/;
const OFFICIAL_UNITS = new Map<string, string>([
  ["sa", "Sa"],
  ["m", "m"],
  ["m²", "m²"],
  ["m³", "m³"],
  ["kg", "kg"],
  ["ton", "Ton"],
  ["ad", "Ad"],
  ["takım", "Takım"],
  ["100 m", "100 m"],
  ["100 m²", "100 m²"],
  ["100 m³", "100 m³"],
]);

export function parseTurkishPrice(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(normalized)) return null;

  const price = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function toOfficialRows(cells: string[][], document: SourceDocument): OfficialPriceRow[] {
  const rows: OfficialPriceRow[] = [];

  for (const sourceRow of cells) {
    const row = sourceRow.map(normalize);
    const codeIndex = row.findIndex((cell) => OFFICIAL_CODE.test(cell));
    if (codeIndex < 0) continue;

    const line = row.slice(codeIndex + 1);
    const terminal = lineTerminal(line);
    const officialName = normalize(line.slice(0, -2).filter(Boolean).join(" "));
    if (!terminal || !officialName) continue;

    rows.push({
      officialCode: row[codeIndex],
      officialName,
      unit: terminal.unit,
      priceTry: terminal.priceTry,
      year: document.year,
      month: document.month,
      category: document.category,
      sourceUrl: document.sourceUrl,
    });
  }

  return rows;
}

function lineTerminal(line: string[]): { unit: string; priceTry: number } | undefined {
  if (line.length < 3) return undefined;
  const unit = normalizeOfficialUnit(line.at(-2) ?? "");
  const priceTry = parseTurkishPrice(line.at(-1) ?? "");
  return unit && priceTry !== null ? { unit, priceTry } : undefined;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOfficialUnit(value: string): string | undefined {
  const normalized = normalize(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/^(100 )?m2$/, "$1m²")
    .replace(/^(100 )?m3$/, "$1m³");
  return OFFICIAL_UNITS.get(normalized);
}
