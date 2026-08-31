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
      url: "https://yfk.csb.gov.tr/augustos-2026",
    });
  });

  it("keeps a direct monthly PDF as a distinct document entry", async () => {
    const indexHtml = await fixture("monthly-index.html");

    expect(findMonthEntry(indexHtml, 2026, 1)).toEqual({
      kind: "document",
      url: "https://webdosya.csb.gov.tr/files/2026/01/1-BF-ocak-2026.pdf",
    });
  });

  it("maps all six announcement links and prefers xlsx to PDF", async () => {
    const announcementHtml = await fixture("august-announcement.html");
    const augustEntry = {
      kind: "announcement" as const,
      url: "https://yfk.csb.gov.tr/augustos-2026",
    };

    const docs = await discoverMonthlyDocuments(augustEntry, async () => announcementHtml);

    expect(docs.map(({ category, format }) => [category, format])).toContainEqual([
      "construction-unit-price", "xlsx",
    ]);
    expect(docs).toHaveLength(6);
    expect(docs.find(({ category }) => category === "construction-rayic")).toMatchObject({
      format: "xlsx",
      sourceUrl: "https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.xlsx",
      discoveredFromUrl: augustEntry.url,
    });
  });
});
