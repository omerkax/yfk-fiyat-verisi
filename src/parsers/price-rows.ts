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
  let candidate: PriceCandidate | undefined;

  const finalizeCandidate = () => {
    if (!candidate?.terminal) return;
    const officialName = normalize(candidate.description.join(" "));
    if (!officialName) return;

    rows.push({
      officialCode: candidate.officialCode,
      officialName,
      unit: candidate.terminal.unit,
      priceTry: candidate.terminal.priceTry,
      year: document.year,
      month: document.month,
      category: document.category,
      sourceUrl: document.sourceUrl,
    });
  };

  const appendLine = (line: string[], columnCount: number) => {
    if (!candidate) return;
    const terminal = candidate.columnCount === columnCount ? lineTerminal(line) : undefined;
    if (terminal) {
      candidate.description.push(...line.slice(0, -2));
      candidate.terminal = terminal;
      finalizeCandidate();
      candidate = undefined;
      return;
    }
    candidate.description.push(...line.filter(Boolean));
  };

  for (const sourceRow of cells) {
    const row = sourceRow.map(normalize);
    const codeIndex = row.findIndex((cell) => OFFICIAL_CODE.test(cell));

    if (codeIndex >= 0) {
      finalizeCandidate();
      candidate = { officialCode: row[codeIndex], description: [], columnCount: row.length };
      appendLine(row.slice(codeIndex + 1), row.length);
    } else {
      appendLine(row, row.length);
    }
  }
  finalizeCandidate();

  return rows;
}

interface PriceCandidate {
  officialCode: string;
  description: string[];
  columnCount: number;
  terminal?: { unit: string; priceTry: number };
}

function lineTerminal(line: string[]): { unit: string; priceTry: number } | undefined {
  if (line.length < 3) return undefined;
  const unit = line.at(-2);
  const priceTry = parseTurkishPrice(line.at(-1) ?? "");
  return unit && priceTry !== null ? { unit, priceTry } : undefined;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
