import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { TrackedItemMatchResult } from "../catalog/matcher.js";
import type { ImportManifest, OfficialPriceRow } from "../types.js";

const CSV_COLUMNS: (keyof OfficialPriceRow)[] = [
  "officialCode",
  "officialName",
  "unit",
  "priceTry",
  "year",
  "month",
  "category",
  "sourceUrl",
];

export async function writeImport(
  outputDir: string,
  manifest: ImportManifest,
  rows: readonly OfficialPriceRow[],
  matches: TrackedItemMatchResult,
): Promise<void> {
  try {
    await stat(outputDir);
    throw new Error(`Import already exists: ${outputDir}`);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  const parentDir = dirname(outputDir);
  const temporaryDir = join(parentDir, `.${basename(outputDir)}.tmp-${randomUUID()}`);

  await mkdir(parentDir, { recursive: true });
  await mkdir(temporaryDir);

  try {
    const writes = [
      writeJson(join(temporaryDir, "manifest.json"), manifest),
      writeJson(join(temporaryDir, "official-price-rows.json"), rows),
      writeFile(join(temporaryDir, "official-price-rows.csv"), toCsv(rows), "utf8"),
      writeJson(join(temporaryDir, "tracked-prices.json"), matches.matchedItems),
      writeJson(join(temporaryDir, "unmatched-tracked-items.json"), matches.unmatched),
    ];
    const writeResults = await Promise.allSettled(writes);
    const failure = writeResults.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;

    try {
      await rename(temporaryDir, outputDir);
    } catch (error) {
      if (error instanceof Error && "code" in error && ["EEXIST", "ENOTEMPTY"].includes(String(error.code))) {
        throw new Error(`Import already exists: ${outputDir}`);
      }
      throw error;
    }
  } catch (error) {
    await rm(temporaryDir, { recursive: true, force: true });
    throw error;
  }
}

function writeJson(path: string, value: unknown): Promise<void> {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toCsv(rows: readonly OfficialPriceRow[]): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => csvCell(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\n")}\n`;
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}
