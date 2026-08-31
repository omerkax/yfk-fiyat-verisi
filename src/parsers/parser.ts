import type { OfficialPriceRow, SourceDocument } from "../types.js";
import { pdfCells } from "./pdf.js";
import { toOfficialRows, toOfficialRowsWithReport, type OfficialRowsReport } from "./price-rows.js";
import { htmlTableCells, tabularCells } from "./tabular.js";

export async function parseSourceDocument(
  document: SourceDocument,
  data: Uint8Array,
): Promise<OfficialPriceRow[]> {
  const cells = await sourceCells(document, data);

  return toOfficialRows(cells, document);
}

export async function parseSourceDocumentWithReport(
  document: SourceDocument,
  data: Uint8Array,
): Promise<OfficialRowsReport> {
  return toOfficialRowsWithReport(await sourceCells(document, data), document);
}

async function sourceCells(document: SourceDocument, data: Uint8Array): Promise<string[][]> {
  const cells = document.format === "pdf"
    ? await pdfCells(data)
    : document.format === "html"
      ? htmlTableCells(data)
      : tabularCells(document.format, data);

  if (document.format === "pdf" && cells.every((row) => row.every((cell) => !cell.trim()))) {
    throw new Error(`Image-only PDF is unsupported: ${document.sourceUrl}`);
  }
  return cells;
}
