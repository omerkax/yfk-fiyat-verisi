import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  parseTurkishPrice,
  toOfficialRows,
  toOfficialRowsWithReport,
} from "../../src/parsers/price-rows.js";
import { parseSourceDocument } from "../../src/parsers/parser.js";
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

const blankPdf = (): Uint8Array => {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R >>\nendobj\n",
    "4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object) => {
    const offset = new TextEncoder().encode(body).byteLength;
    body += object;
    return offset;
  });
  const xrefOffset = new TextEncoder().encode(body).byteLength;
  body += `xref\n0 5\n0000000000 65535 f \n${offsets.map((offset) => (
    `${String(offset).padStart(10, "0")} 00000 n \n`
  )).join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(body);
};

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

  it("omits a code row without a terminal despite a same-width PDF footer", () => {
    const cells = [
      ["10.100.1001", "Taşcı ustası", "", ""],
      ["", "", "Sayfa", "1"],
    ];

    expect(toOfficialRows(cells, augustDocument)).toEqual([]);
  });

  it("does not use a same-width numeric continuation as a terminal", () => {
    const cells = [
      ["10.100.1001", "Taşcı", "", ""],
      ["", "ustası", "Sa", "1"],
      ["", "", "Sa", "354,41"],
    ];

    expect(toOfficialRows(cells, augustDocument)).toEqual([]);
  });

  it("categorizes a combined document strictly by official code family and reports unknowns", () => {
    const combinedDocument: SourceDocument = {
      year: 2026,
      month: 1,
      category: "combined",
      sourceUrl: "https://webdosya.csb.gov.tr/files/2026/01/1-BF-ocak-2026.pdf",
      format: "pdf",
      discoveredFromUrl: "https://yfk.csb.gov.tr/aylik-guncel-rayic-ve-birim-fiyat-listeleri-113351",
    };
    const cells = [
      ["10.100.1001", "İnşaat rayiç", "Sa", "1,00"],
      ["15.100.1001", "İnşaat birim fiyat", "m²", "2,00"],
      ["20.100.1001", "Mekanik rayiç", "Ad", "3,00"],
      ["25.100.1001", "Mekanik birim fiyat", "Ad", "4,00"],
      ["30.100.1001", "Elektrik rayiç", "Ad", "5,00"],
      ["35.100.1001", "Elektrik birim fiyat", "Ad", "6,00"],
      ["40.100.1001", "Bilinmeyen aile", "Ad", "7,00"],
    ];

    expect(toOfficialRowsWithReport(cells, combinedDocument)).toEqual({
      rows: expect.arrayContaining([
        expect.objectContaining({ officialCode: "10.100.1001", category: "construction-rayic" }),
        expect.objectContaining({ officialCode: "15.100.1001", category: "construction-unit-price" }),
        expect.objectContaining({ officialCode: "20.100.1001", category: "mechanical-rayic" }),
        expect.objectContaining({ officialCode: "25.100.1001", category: "mechanical-unit-price" }),
        expect.objectContaining({ officialCode: "30.100.1001", category: "electrical-rayic" }),
        expect.objectContaining({ officialCode: "35.100.1001", category: "electrical-unit-price" }),
      ]),
      omittedUnknownCodeFamilies: ["40"],
    });
  });

  it("stops with an explicit error for an image-only PDF", async () => {
    await expect(parseSourceDocument(augustDocument, blankPdf())).rejects.toThrow(
      "Image-only PDF is unsupported",
    );
  });
});
