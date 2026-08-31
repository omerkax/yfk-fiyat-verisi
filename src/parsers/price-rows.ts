import type { OfficialPriceRow, SourceCategory, SourceDocument } from "../types.js";

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

const COMBINED_CODE_FAMILIES: Readonly<Record<string, SourceCategory>> = {
  "10": "construction-rayic",
  "15": "construction-unit-price",
  "20": "mechanical-rayic",
  "25": "mechanical-unit-price",
  "30": "electrical-rayic",
  "35": "electrical-unit-price",
};

export interface OfficialRowsReport {
  rows: OfficialPriceRow[];
  omittedUnknownCodeFamilies: string[];
}

export function parseTurkishPrice(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(normalized)) return null;

  const price = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function toOfficialRows(cells: string[][], document: SourceDocument): OfficialPriceRow[] {
  return toOfficialRowsWithReport(cells, document).rows;
}

export function toOfficialRowsWithReport(
  cells: string[][],
  document: SourceDocument,
): OfficialRowsReport {
  const tempRows: Array<{
    officialCode: string;
    unit: string;
    priceTry: number;
    descriptionParts: string[];
    lineIndex: number;
  }> = [];

  const omittedUnknownCodeFamilies = new Set<string>();

  // First pass: find all lines containing an official Poz No code
  for (let idx = 0; idx < cells.length; idx++) {
    const row = cells[idx].map(normalize);
    const codeIndex = row.findIndex((cell) => OFFICIAL_CODE.test(cell));
    if (codeIndex < 0) continue;

    const code = row[codeIndex];
    const category = document.category === "combined"
      ? COMBINED_CODE_FAMILIES[code.slice(0, 2)]
      : document.category;

    if (!category) {
      omittedUnknownCodeFamilies.add(code.slice(0, 2));
      continue;
    }

    const lineParts = row.slice(codeIndex + 1).map(normalize).filter(Boolean);

    // Find unit and price by scanning right-to-left
    let terminal: { unit: string; priceTry: number; unitIndex: number } | undefined;
    for (let i = lineParts.length - 2; i >= 0; i--) {
      const unitCandidate = normalizeOfficialUnit(lineParts[i]);
      if (unitCandidate) {
        const priceCandidate = parseTurkishPrice(lineParts[i + 1]);
        if (priceCandidate !== null) {
          terminal = { unit: unitCandidate, priceTry: priceCandidate, unitIndex: i };
          break;
        }
      }
    }

    if (!terminal) continue;

    const onLineDescParts = lineParts.slice(0, terminal.unitIndex);

    tempRows.push({
      officialCode: code,
      unit: terminal.unit,
      priceTry: terminal.priceTry,
      descriptionParts: onLineDescParts,
      lineIndex: idx,
    });
  }

  // Second pass: associate non-code lines to their closest Poz No
  for (let idx = 0; idx < cells.length; idx++) {
    const row = cells[idx].map(normalize);
    const hasCode = row.some((cell) => OFFICIAL_CODE.test(cell));
    if (hasCode) continue;

    const text = row.filter(Boolean).join(" ");
    if (shouldIgnoreLine(text)) continue;

    let closestIndex = -1;
    let minDistance = Infinity;

    for (let r = 0; r < tempRows.length; r++) {
      const distance = Math.abs(tempRows[r].lineIndex - idx);
      if (distance < minDistance || (distance === minDistance && tempRows[r].lineIndex < idx)) {
        minDistance = distance;
        closestIndex = r;
      }
    }

    if (closestIndex >= 0 && minDistance <= 2) {
      tempRows[closestIndex].descriptionParts.push(text);
    }
  }

  // Convert tempRows to final OfficialPriceRow list
  const rows: OfficialPriceRow[] = tempRows.map((temp) => {
    const officialName = normalize(temp.descriptionParts.filter(Boolean).join(" "));
    const category = document.category === "combined"
      ? COMBINED_CODE_FAMILIES[temp.officialCode.slice(0, 2)]
      : document.category;

    return {
      officialCode: temp.officialCode,
      officialName,
      unit: temp.unit,
      priceTry: temp.priceTry,
      year: document.year,
      month: document.month,
      category: category!,
      sourceUrl: document.sourceUrl,
    };
  }).filter((row) => row.officialName);

  return { rows, omittedUnknownCodeFamilies: [...omittedUnknownCodeFamilies] };
}

function shouldIgnoreLine(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return true;

  if (/^\d+$/.test(normalized)) return true;

  const lowercase = normalized.toLowerCase();

  if (
    lowercase.includes("sayfa") ||
    lowercase.includes("tüik") ||
    lowercase.includes("endeks") ||
    lowercase.includes("güncel") ||
    lowercase.includes("aylık") ||
    lowercase.includes("fiyat listesi") ||
    lowercase.includes("birim fiyat") ||
    lowercase.includes("poz no") ||
    lowercase.includes("tanım") ||
    lowercase.includes("birim") ||
    lowercase.includes("fiyatı") ||
    lowercase.includes("tanımı") ||
    lowercase.includes("birimi") ||
    lowercase.includes("sıra no") ||
    lowercase.includes("yılı") ||
    lowercase.includes("ağustos") ||
    lowercase.includes("eylül") ||
    lowercase.includes("ekim") ||
    lowercase.includes("kasım") ||
    lowercase.includes("aralık") ||
    lowercase.includes("ocak") ||
    lowercase.includes("şubat") ||
    lowercase.includes("mart") ||
    lowercase.includes("nisan") ||
    lowercase.includes("mayıs") ||
    lowercase.includes("haziran") ||
    lowercase.includes("temmuz")
  ) {
    return true;
  }

  // Header column patterns
  if (/fiyat\s*\(tl\)/i.test(lowercase)) return true;
  if (/bedel[iı]\s*\(tl\)/i.test(lowercase)) return true;
  if (/tutar\s*\(tl\)/i.test(lowercase)) return true;
  if (/^[\s(]*tl[\s)]*$/i.test(normalized)) return true;

  if (normalized.endsWith(":")) return true;
  if (normalized.includes(":")) return true;

  if (/[a-zA-ZİIĞÜŞÖÇ]/.test(normalized) && normalized === normalized.toUpperCase()) {
    return true;
  }

  return false;
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
