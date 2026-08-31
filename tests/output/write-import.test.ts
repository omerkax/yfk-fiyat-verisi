import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeImport } from "../../src/output/write-import.js";
import type { ImportManifest, OfficialPriceRow, TrackedItem } from "../../src/types.js";

const { writeFileMock } = vi.hoisted(() => ({ writeFileMock: vi.fn() }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: writeFileMock };
});

const cleanup: string[] = [];

const priceRow: OfficialPriceRow = {
  officialCode: "10.100.1001",
  officialName: "Taşcı ustası \"A sınıfı\"",
  unit: "Sa",
  priceTry: 354.41,
  year: 2026,
  month: 8,
  category: "construction-rayic",
  sourceUrl: "https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.pdf",
};

const trackedItem: TrackedItem = {
  id: "construction-stone-mason",
  displayName: "Taşcı ustası",
  category: "construction-labor",
  officialCode: "10.100.1001",
  officialName: "Taşcı ustası",
  unit: "Sa",
  sourceCategory: "construction-rayic",
};

const manifest: ImportManifest = {
  year: 2026,
  month: 8,
  fetchedAt: "2026-08-31T10:00:00.000Z",
  documents: [{
    year: 2026,
    month: 8,
    category: "construction-rayic",
    sourceUrl: priceRow.sourceUrl,
    format: "pdf",
    discoveredFromUrl: "https://yfk.csb.gov.tr/duyuru?donem=2026-08",
    sha256: "a".repeat(64),
    byteLength: 1234,
    fetchedAt: "2026-08-31T10:00:00.000Z",
  }],
};

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  writeFileMock.mockImplementation(actual.writeFile);
});

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => fs.rm(path, { recursive: true, force: true })));
  writeFileMock.mockReset();
});

describe("import artifact writer", () => {
  it("writes manifest, all rows, CSV, matches, and unmatched report", async () => {
    const parentDir = await fs.mkdtemp(join(tmpdir(), "yfk-write-import-"));
    cleanup.push(parentDir);
    const outputDir = join(parentDir, "2026-08");
    const matches = {
      matched: [priceRow],
      matchedItems: [{ item: trackedItem, row: priceRow }],
      unmatched: [{ item: { ...trackedItem, officialCode: "10.100.1002" }, reason: "official-code-not-present" }],
    };

    await writeImport(outputDir, manifest, [priceRow], matches);

    await expect(fs.readFile(join(outputDir, "manifest.json"), "utf8").then(JSON.parse)).resolves.toEqual(manifest);
    await expect(fs.readFile(join(outputDir, "official-price-rows.json"), "utf8")).resolves.toContain("10.100.1001");
    await expect(fs.readFile(join(outputDir, "official-price-rows.csv"), "utf8")).resolves.toBe(
      "\uFEFF\"officialCode\",\"officialName\",\"unit\",\"priceTry\",\"year\",\"month\",\"category\",\"sourceUrl\"\n\"10.100.1001\",\"Taşcı ustası \"\"A sınıfı\"\"\",\"Sa\",\"354.41\",\"2026\",\"8\",\"construction-rayic\",\"https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.pdf\"\n",
    );
    await expect(fs.readFile(join(outputDir, "tracked-prices.json"), "utf8")).resolves.toContain("construction-stone-mason");
    await expect(fs.readFile(join(outputDir, "unmatched-tracked-items.json"), "utf8")).resolves.toContain("official-code-not-present");
  });

  it("cleans temporary artifacts when a write fails before publishing", async () => {
    const parentDir = await fs.mkdtemp(join(tmpdir(), "yfk-write-import-failure-"));
    cleanup.push(parentDir);
    const outputDir = join(parentDir, "2026-08");
    writeFileMock.mockRejectedValueOnce(new Error("simulated write failure"));
    const matches = { matched: [priceRow], matchedItems: [{ item: trackedItem, row: priceRow }], unmatched: [] };

    await expect(writeImport(outputDir, manifest, [priceRow], matches)).rejects.toThrow("simulated write failure");
    expect(await fs.readdir(parentDir)).toEqual([]);
    await expect(fs.readFile(join(outputDir, "manifest.json"), "utf8")).rejects.toThrow();
  });
});
