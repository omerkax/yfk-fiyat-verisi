import type { OfficialPriceRow, SourceDocument } from "../types.js";
import { pdfCells } from "./pdf.js";
import { toOfficialRows } from "./price-rows.js";
import { htmlTableCells, tabularCells } from "./tabular.js";

export async function parseSourceDocument(
  document: SourceDocument,
  data: Uint8Array,
): Promise<OfficialPriceRow[]> {
  const cells = document.format === "pdf"
    ? await pdfCells(data)
    : document.format === "html"
      ? htmlTableCells(data)
      : tabularCells(document.format, data);

  return toOfficialRows(cells, document);
}
