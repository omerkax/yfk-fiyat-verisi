import type { OfficialPriceRow, SourceDocument } from "../types.js";

const OFFICIAL_CODE = /^(?:\d{2}(?:\.\d{3}){2,4}|\d{2}(?:\.\d{3})+\.\d{4})$/;

export function parseTurkishPrice(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(normalized)) return null;

  const price = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function toOfficialRows(cells: string[][], document: SourceDocument): OfficialPriceRow[] {
  const rows: OfficialPriceRow[] = [];
  let candidate: string[] | undefined;

  const acceptCandidate = () => {
    if (!candidate) return;
    const priceIndex = findPriceIndex(candidate);
    if (priceIndex === undefined || priceIndex < 2) return;

    const priceTry = parseTurkishPrice(candidate[priceIndex]);
    const unit = normalize(candidate[priceIndex - 1]);
    const officialName = normalize(candidate.slice(1, priceIndex - 1).join(" "));
    const officialCode = candidate[0];
    if (!officialName || !unit || priceTry === null) return;

    rows.push({
      officialCode,
      officialName,
      unit,
      priceTry,
      year: document.year,
      month: document.month,
      category: document.category,
      sourceUrl: document.sourceUrl,
    });
  };

  for (const sourceRow of cells) {
    const row = sourceRow.map(normalize).filter(Boolean);
    const codeIndex = row.findIndex((cell) => OFFICIAL_CODE.test(cell));

    if (codeIndex >= 0) {
      acceptCandidate();
      candidate = [row[codeIndex], ...row.slice(codeIndex + 1)];
    } else if (candidate) {
      candidate.push(...row);
    }
  }
  acceptCandidate();

  return rows;
}

function findPriceIndex(candidate: string[]): number | undefined {
  for (let index = candidate.length - 1; index > 0; index -= 1) {
    if (parseTurkishPrice(candidate[index]) !== null) return index;
  }
  return undefined;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
