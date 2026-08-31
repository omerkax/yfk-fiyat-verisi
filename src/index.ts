import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { matchTrackedItems, type TrackedItemMatchResult } from "./catalog/matcher.js";
import { TRACKED_ITEMS } from "./catalog/tracked-items.js";
import { MONTHLY_INDEX_URL } from "./config.js";
import { discoverMonthlyDocuments } from "./discovery/month-documents.js";
import { findMonthEntry } from "./discovery/monthly-index.js";
import { OfficialFetcher } from "./http/official-fetcher.js";
import { writeImport } from "./output/write-import.js";
import { parseSourceDocumentWithReport } from "./parsers/parser.js";
import type { OfficialRowsReport } from "./parsers/price-rows.js";
import type {
  ImportManifest,
  OfficialPriceRow,
  SourceCategory,
  SourceDocument,
} from "./types.js";
import { SOURCE_CATEGORIES } from "./types.js";

export interface CliOptions {
  year: number;
  month: number;
  outputDir: string;
}

type ParseDocument = (
  document: SourceDocument,
  data: Uint8Array,
) => Promise<OfficialPriceRow[] | OfficialRowsReport>;

export interface ImportDependencies {
  fetchText: (url: string) => Promise<string>;
  fetchBytes: (url: string) => Promise<Uint8Array>;
  parseDocument: ParseDocument;
  publish: typeof writeImport;
  now: () => Date;
  log: (message: string) => void;
}

export interface ImportReport {
  artifactDirectory: string;
  manifest: ImportManifest;
  rows: OfficialPriceRow[];
  matches: TrackedItemMatchResult;
  omittedUnknownCodeFamilies: string[];
}

const defaultDependencies = (): ImportDependencies => {
  const fetcher = new OfficialFetcher();
  return {
    fetchText: (url) => fetcher.fetchText(url),
    fetchBytes: (url) => fetcher.fetchBytes(url),
    parseDocument: parseSourceDocumentWithReport,
    publish: writeImport,
    now: () => new Date(),
    log: console.log,
  };
};

export async function runCli(
  args: string[],
  dependencyOverrides: Partial<ImportDependencies> = {},
): Promise<ImportReport> {
  const dependencies = { ...defaultDependencies(), ...dependencyOverrides };
  return runImport(parseCliArgs(args, dependencies.now()), dependencies);
}

export async function runImport(
  options: CliOptions,
  dependencyOverrides: Partial<ImportDependencies> = {},
): Promise<ImportReport> {
  validateOptions(options);
  const dependencies = { ...defaultDependencies(), ...dependencyOverrides };
  const artifactDirectory = join(
    options.outputDir,
    `${options.year}-${String(options.month).padStart(2, "0")}`,
  );
  const indexHtml = await dependencies.fetchText(MONTHLY_INDEX_URL);
  const entry = findMonthEntry(indexHtml, options.year, options.month);
  const documents = await discoverMonthlyDocuments(entry, dependencies.fetchText);
  if (documents.length === 0) throw new Error("No selected official source documents");

  const fetchedAt = dependencies.now().toISOString();
  const manifestDocuments: ImportManifest["documents"] = [];
  const rows: OfficialPriceRow[] = [];
  const omittedUnknownCodeFamilies = new Set<string>();

  for (const document of documents) {
    const data = await dependencies.fetchBytes(document.sourceUrl);
    const parsed = await dependencies.parseDocument(document, data);
    const report = Array.isArray(parsed)
      ? { rows: parsed, omittedUnknownCodeFamilies: [] }
      : parsed;
    rows.push(...report.rows);
    report.omittedUnknownCodeFamilies.forEach((family) => omittedUnknownCodeFamilies.add(family));
    manifestDocuments.push({
      ...document,
      sha256: createHash("sha256").update(data).digest("hex"),
      byteLength: data.byteLength,
      fetchedAt,
    });
  }

  if (rows.length === 0) throw new Error("No verified official price rows");

  const manifest: ImportManifest = {
    year: options.year,
    month: options.month,
    fetchedAt,
    documents: manifestDocuments,
  };
  const matches = matchTrackedItems(rows, TRACKED_ITEMS);
  await dependencies.publish(artifactDirectory, manifest, rows, matches);
  printSummary(dependencies.log, documents, rows, matches, artifactDirectory);
  if (omittedUnknownCodeFamilies.size > 0) {
    dependencies.log(`omitted-unknown-code-families=${[...omittedUnknownCodeFamilies].join(",")}`);
  }

  return {
    artifactDirectory,
    manifest,
    rows,
    matches,
    omittedUnknownCodeFamilies: [...omittedUnknownCodeFamilies],
  };
}

function parseCliArgs(args: string[], now: Date): CliOptions {
  const current = istanbulYearMonth(now);
  const values: Record<string, string> = {};
  const allowed = new Set(["--year", "--month", "--output-dir"]);

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!allowed.has(flag)) throw new Error(`Unknown argument: ${flag}`);
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    if (values[flag] !== undefined) throw new Error(`Duplicate argument: ${flag}`);
    values[flag] = value;
  }

  const year = values["--year"] === undefined ? current.year : integer(values["--year"], "year");
  const month = values["--month"] === undefined ? current.month : integer(values["--month"], "month");
  const outputDir = values["--output-dir"] ?? "output/imports";
  const options = { year, month, outputDir };
  validateOptions(options);
  return options;
}

function validateOptions(options: CliOptions): void {
  if (!Number.isInteger(options.year) || options.year < 1) throw new Error("year must be a positive integer");
  if (!Number.isInteger(options.month) || options.month < 1 || options.month > 12) {
    throw new Error("month must be between 1 and 12");
  }
  if (!options.outputDir.trim()) throw new Error("output-dir must not be empty");
}

function integer(value: string, name: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer`);
  return Number(value);
}

function istanbulYearMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find(({ type }) => type === "year")?.value),
    month: Number(parts.find(({ type }) => type === "month")?.value),
  };
}

function printSummary(
  log: (message: string) => void,
  documents: SourceDocument[],
  rows: OfficialPriceRow[],
  matches: TrackedItemMatchResult,
  artifactDirectory: string,
): void {
  const combined = documents.find(({ category }) => category === "combined");
  if (combined) log(`combined-source selected=${combined.sourceUrl}`);

  for (const category of SOURCE_CATEGORIES) {
    const document = documents.find((candidate) => candidate.category === category);
    const parsedCount = rows.filter((row) => row.category === category).length;
    const matchedCount = matches.matchedItems.filter(({ row }) => row.category === category).length;
    const unmatchedCount = matches.unmatched.filter(({ item }) => item.sourceCategory === category).length;
    log(
      `${category} selected=${document?.sourceUrl ?? (combined ? "combined" : "missing")} `
      + `parsed=${parsedCount} matched=${matchedCount} unmatched=${unmatchedCount}`,
    );
  }
  log(`artifacts=${artifactDirectory}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
