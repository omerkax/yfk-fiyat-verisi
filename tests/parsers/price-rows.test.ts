import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseTurkishPrice, toOfficialRows } from "../../src/parsers/price-rows.js";
import type { SourceDocument } from "../../src/types.js";

const augustDocument: SourceDocument = {
  year: 2026,
  month: 8,
  category: "construction-rayic",
  sourceUrl: "https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.pdf",
  format: "pdf",
  discoveredFromUrl: "https://yfk.csb.gov.tr/duyuru?donem=2026-08",
};

const fixtureCells = async () => (await readFile(
  new URL("../fixtures/august-construction-rayic.txt", import.meta.url),
  "utf8",
)).trim().split("\n").map((line) => line.split("\t"));

describe("official price rows", () => {
  it("parses comma-decimal prices and rejects ambiguous values", () => {
    expect(parseTurkishPrice("12.345,67")).toBe(12345.67);
    expect(parseTurkishPrice("354,41")).toBe(354.41);
    expect(parseTurkishPrice("-")).toBeNull();
  });

  it("keeps a real PDF row with code, name, unit and price", async () => {
    expect(toOfficialRows(await fixtureCells(), augustDocument)).toContainEqual({
      officialCode: "10.100.1001", officialName: "Taşcı ustası", unit: "Sa",
      priceTry: 354.41, year: 2026, month: 8,
      category: "construction-rayic", sourceUrl: augustDocument.sourceUrl,
    });
  });

  it("does not let a PDF footer replace a row price", async () => {
    const cells = [
      ...(await fixtureCells()),
      ["Sayfa", "1"],
    ];

    expect(toOfficialRows(cells, augustDocument)).toContainEqual({
      officialCode: "10.100.1001", officialName: "Taşcı ustası", unit: "Sa",
      priceTry: 354.41, year: 2026, month: 8,
      category: "construction-rayic", sourceUrl: augustDocument.sourceUrl,
    });
    expect(toOfficialRows(cells, augustDocument)).not.toContainEqual(expect.objectContaining({
      officialCode: "10.100.1001",
      priceTry: 1,
    }));
  });
});
