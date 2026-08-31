import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { discoverMonthlyDocuments } from "../../src/discovery/month-documents.js";
import { findMonthEntry } from "../../src/discovery/monthly-index.js";

const fixture = (name: string) => readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("monthly document discovery", () => {
  it("resolves an August announcement link without a hard-coded file URL", async () => {
    const indexHtml = await fixture("monthly-index.html");

    expect(findMonthEntry(indexHtml, 2026, 8)).toEqual({
      kind: "announcement",
      url: "https://yfk.csb.gov.tr/duyuru?donem=2026-08",
      year: 2026,
      month: 8,
    });
  });

  it("keeps a direct monthly PDF as a distinct document entry", async () => {
    const indexHtml = await fixture("monthly-index.html");

    expect(findMonthEntry(indexHtml, 2026, 1)).toEqual({
      kind: "document",
      url: "https://webdosya.csb.gov.tr/files/2026/01/1-BF-ocak-2026.pdf",
      year: 2026,
      month: 1,
    });
  });

  it("maps all six announcement links and prefers xlsx to PDF", async () => {
    const announcementHtml = await fixture("august-announcement.html");
    const augustEntry = findMonthEntry(await fixture("monthly-index.html"), 2026, 8);

    const docs = await discoverMonthlyDocuments(augustEntry, async () => ({
      html: announcementHtml,
      attachmentContentTypes: {
        "https://webdosya.csb.gov.tr/files/2026/08/dosya?ek=mekanik-rayic": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }));

    expect(docs.map(({ category, format }) => [category, format])).toContainEqual([
      "construction-unit-price", "xlsx",
    ]);
    expect(docs).toHaveLength(6);
    expect(docs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: "mechanical-rayic",
        format: "xlsx",
        year: 2026,
        month: 8,
        sourceUrl: "https://webdosya.csb.gov.tr/files/2026/08/dosya?ek=mekanik-rayic",
      }),
    ]));
    expect(docs.find(({ category }) => category === "construction-rayic")).toMatchObject({
      format: "xlsx",
      sourceUrl: "https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.xlsx",
      discoveredFromUrl: augustEntry.url,
      year: 2026,
      month: 8,
    });
    expect(docs).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceUrl: "https://example.invalid/files/2026/08/elektrik-rayicleri.xlsx" }),
    ]));
  });
});
