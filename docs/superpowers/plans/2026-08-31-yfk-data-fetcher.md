# YFK Data Fetcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI that dynamically discovers YFK monthly source files and writes only source-verified price data to JSON and CSV files.

**Architecture:** The CLI resolves a year/month from the official index, follows any monthly announcement pages, chooses the highest-ranked document format per category, and converts each source to normalized official-price rows. A code-only catalog filters those rows into a separate tracked output without mutating or persisting data.

**Tech Stack:** Node.js 20+, TypeScript, tsx, Vitest, Cheerio, SheetJS `xlsx`, `pdfjs-dist`, native `fetch`, and Node `crypto`/`fs` APIs.

**Spec:** `docs/superpowers/specs/2026-08-31-yfk-data-fetcher-design.md`

## Global Constraints

- Only `https` URLs hosted by `yfk.csb.gov.tr` and `webdosya.csb.gov.tr` may be fetched.
- Discover source URLs from the official pages at runtime; do not hard-code a month-specific file URL.
- Rank duplicate category sources strictly as XLSX, CSV, HTML, then PDF.
- Never write a price that lacks a valid official code, official name, unit, numeric price, category, source URL, year, and month.
- Match tracked items by exact official code only; no fuzzy-match fallback is permitted.
- Do not add a database, API server, UI, scheduler, calculation, or prediction feature.
- Write generated imports only under `output/imports/`; add that directory to `.gitignore`.
- The supplied directory is not a Git repository, so this plan deliberately contains no commit commands.

---

## File Structure

```text
package.json                              CLI scripts and dependencies
tsconfig.json                             Strict TypeScript configuration
vitest.config.ts                          Node test runner configuration
.gitignore                                Excludes generated import output and dependencies
README.md                                 Setup, commands, source policy, output contract
src/index.ts                              Argument parsing and CLI orchestration
src/types.ts                              Public domain contracts
src/config.ts                             Source URL, allowed hosts, rank, category metadata
src/http/official-fetcher.ts             Safe, timeout-bound official HTTP client
src/discovery/monthly-index.ts           Year/month page discovery
src/discovery/month-documents.ts         Category document extraction and ranking
src/parsers/parser.ts                    Parser interface and dispatcher
src/parsers/tabular.ts                   XLSX, CSV, and HTML-table conversion
src/parsers/pdf.ts                       PDF text-coordinate line reconstruction
src/parsers/price-rows.ts                Header recognition, row validation, Turkish price parsing
src/catalog/tracked-items.ts             Source-verified seed catalog
src/catalog/matcher.ts                   Exact-code tracked-item matcher
src/output/write-import.ts               Manifest, JSON, CSV, and unmatched-report writer
tests/discovery/monthly-index.test.ts    Index and month-document discovery tests
tests/parsers/price-rows.test.ts         Price, unit, and PDF-line parsing tests
tests/catalog/matcher.test.ts             Exact-code matching tests
tests/output/write-import.test.ts         Generated artifact tests
tests/fixtures/*.html                    Saved official-page-shaped HTML fixtures
tests/fixtures/*.txt                     Saved extracted official-PDF-text fixture
scripts/smoke-live.ts                    Optional real-source smoke test
```

### Task 1: Establish the typed CLI workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/types.ts`
- Create: `tests/types.test.ts`

**Interfaces:**
- Produces `SourceCategory`, `SourceFormat`, `SourceDocument`, `OfficialPriceRow`, `TrackedItem`, `ImportManifest`, and `UnmatchedTrackedItem` types for all later tasks.
- Produces `pnpm test`, `pnpm typecheck`, `pnpm fetch`, and `pnpm smoke:live` commands.

- [ ] **Step 1: Write the failing domain-contract test**

```ts
import { describe, expect, it } from "vitest";
import { SOURCE_CATEGORIES } from "../src/types.js";

describe("source category contract", () => {
  it("contains the six official monthly categories", () => {
    expect(SOURCE_CATEGORIES).toEqual([
      "construction-rayic",
      "mechanical-rayic",
      "electrical-rayic",
      "construction-unit-price",
      "mechanical-unit-price",
      "electrical-unit-price",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/types.test.ts`

Expected: FAIL because the project and `src/types.ts` do not exist.

- [ ] **Step 3: Add the minimal project configuration and types**

```ts
export const SOURCE_CATEGORIES = [
  "construction-rayic", "mechanical-rayic", "electrical-rayic",
  "construction-unit-price", "mechanical-unit-price", "electrical-unit-price",
] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];
export type SourceFormat = "xlsx" | "csv" | "html" | "pdf";

export interface SourceDocument {
  year: number; month: number; category: SourceCategory;
  sourceUrl: string; format: SourceFormat; discoveredFromUrl: string;
}
```

Configure strict NodeNext TypeScript, Vitest's Node environment, ESM package mode,
and dependencies `cheerio`, `pdfjs-dist`, `xlsx`, `tsx`, `typescript`, `vitest`,
and `@types/node`. Exclude `output/imports/` and `node_modules/` in `.gitignore`.

- [ ] **Step 4: Run type and unit checks**

Run: `pnpm typecheck && pnpm test tests/types.test.ts`

Expected: both commands PASS.

### Task 2: Discover months and official category documents

**Files:**
- Create: `src/config.ts`
- Create: `src/http/official-fetcher.ts`
- Create: `src/discovery/monthly-index.ts`
- Create: `src/discovery/month-documents.ts`
- Create: `tests/fixtures/monthly-index.html`
- Create: `tests/fixtures/august-announcement.html`
- Create: `tests/discovery/monthly-index.test.ts`

**Interfaces:**
- Consumes `SourceCategory`, `SourceDocument`, and `SourceFormat` from `src/types.ts`.
- Produces `findMonthEntry(html: string, year: number, month: number): MonthEntry`, `discoverMonthlyDocuments(entry: MonthEntry, fetchText: FetchText): Promise<SourceDocument[]>`, and `selectPreferredDocuments(documents: SourceDocument[]): SourceDocument[]`.

- [ ] **Step 1: Write failing discovery tests from saved official-shaped HTML**

```ts
it("resolves an August announcement link without a hard-coded file URL", () => {
  expect(findMonthEntry(indexHtml, 2026, 8)).toEqual({
    kind: "announcement",
    url: "https://yfk.csb.gov.tr/augustos-2026",
  });
});

it("maps all six announcement links and prefers xlsx to PDF", async () => {
  const docs = await discoverMonthlyDocuments(augustEntry, async () => announcementHtml);
  expect(docs.map(({ category, format }) => [category, format])).toContainEqual([
    "construction-unit-price", "xlsx",
  ]);
  expect(docs).toHaveLength(6);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/discovery/monthly-index.test.ts`

Expected: FAIL because discovery modules do not exist.

- [ ] **Step 3: Implement source guardrails and discovery**

Implement `OfficialFetcher` with a 30-second `AbortSignal.timeout`, the stable
user-agent `yfk-price-fetcher/1.0`, redirect following, status checking, and
a host allow-list (`yfk.csb.gov.tr`, `webdosya.csb.gov.tr`). Reject non-HTTPS
or off-list URLs before fetching.

In `monthly-index.ts`, find the annual table whose heading contains the requested
year; convert Turkish month labels (including `Mayıs`, `Ağustos`, and `Şubat`) to
their numbers. Return an `announcement` entry for an official page and a `document`
entry for a direct source file. Do not use arbitrary table positions.

In `month-documents.ts`, normalize link text by stripping tags, diacritics, and
spacing; map the six known label combinations to `SourceCategory`. Infer the
format from content-type or file extension. Group links by category and retain
only the format with rank `{ xlsx: 0, csv: 1, html: 2, pdf: 3 }`.

- [ ] **Step 4: Run focused tests**

Run: `pnpm test tests/discovery/monthly-index.test.ts`

Expected: PASS, with exactly six selected category documents from the fixture.

### Task 3: Normalize source tables into verified official rows

**Files:**
- Create: `src/parsers/parser.ts`
- Create: `src/parsers/tabular.ts`
- Create: `src/parsers/pdf.ts`
- Create: `src/parsers/price-rows.ts`
- Create: `tests/fixtures/august-construction-rayic.txt`
- Create: `tests/parsers/price-rows.test.ts`

**Interfaces:**
- Consumes `SourceDocument` and source bytes.
- Produces `parseSourceDocument(document: SourceDocument, data: Uint8Array): Promise<OfficialPriceRow[]>`.
- Produces `parseTurkishPrice(value: string): number | null` and `toOfficialRows(cells: string[][], document: SourceDocument): OfficialPriceRow[]`.

- [ ] **Step 1: Write failing parsing tests**

```ts
it("parses comma-decimal prices and rejects ambiguous values", () => {
  expect(parseTurkishPrice("12.345,67")).toBe(12345.67);
  expect(parseTurkishPrice("354,41")).toBe(354.41);
  expect(parseTurkishPrice("-" )).toBeNull();
});

it("keeps a real PDF row with code, name, unit and price", () => {
  expect(toOfficialRows(fixtureCells, augustDocument)).toContainEqual({
    officialCode: "10.100.1001", officialName: "Taşcı ustası", unit: "Sa",
    priceTry: 354.41, year: 2026, month: 8,
    category: "construction-rayic", sourceUrl: augustDocument.sourceUrl,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/parsers/price-rows.test.ts`

Expected: FAIL because parser modules do not exist.

- [ ] **Step 3: Implement parser dispatcher and row validator**

Use SheetJS to convert both XLSX and CSV workbook sheets to cell matrices. Use
Cheerio to extract `<tr>`/`<th>`/`<td>` values from HTML tables. Use `pdfjs-dist`
with workers disabled to extract each PDF page's text items; group items with a
near-equal Y coordinate, sort each group by X, and convert the resulting lines
to candidate cells.

In `price-rows.ts`, identify rows from a code matching `/^\\d{2}(?:\\.\\d{3}){2,4}$/`.
Accumulate wrapped description text until the next code. Require a non-empty
name, unit, and finite non-negative Turkish price. Normalize whitespace but
retain the official Turkish name. Every accepted row must copy metadata from
the source document; every rejected candidate is omitted rather than repaired.

- [ ] **Step 4: Run parser tests and typecheck**

Run: `pnpm typecheck && pnpm test tests/parsers/price-rows.test.ts`

Expected: PASS.

### Task 4: Add source-verified catalog matching and file outputs

**Files:**
- Create: `src/catalog/tracked-items.ts`
- Create: `src/catalog/matcher.ts`
- Create: `src/output/write-import.ts`
- Create: `tests/catalog/matcher.test.ts`
- Create: `tests/output/write-import.test.ts`

**Interfaces:**
- Consumes `OfficialPriceRow[]`, `SourceDocument[]`, downloaded byte digests, and `TrackedItem[]`.
- Produces `matchTrackedItems(rows, items): { matched: OfficialPriceRow[]; unmatched: UnmatchedTrackedItem[] }`.
- Produces `writeImport(outputDir, manifest, rows, matches): Promise<void>`.

- [ ] **Step 1: Write failing matcher and artifact tests**

```ts
it("matches only an exact official code", () => {
  const result = matchTrackedItems([row("10.100.1001")], [item("10.100.1001")]);
  expect(result.matched).toHaveLength(1);
  expect(matchTrackedItems([row("10.100.1001")], [item("10.100.1002")]).matched).toHaveLength(0);
});

it("writes manifest, all rows, CSV, matches, and unmatched report", async () => {
  await writeImport(tempDir, manifest, [priceRow], matchResult);
  await expect(readFile(join(tempDir, "manifest.json"), "utf8")).resolves.toContain("sha256");
  await expect(readFile(join(tempDir, "official-price-rows.csv"), "utf8")).resolves.toContain("10.100.1001");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/catalog/matcher.test.ts tests/output/write-import.test.ts`

Expected: FAIL because the catalog, matcher, and output modules do not exist.

- [ ] **Step 3: Implement exact matching and atomic output generation**

Populate `TRACKED_ITEMS` with 30-50 items whose code, official name, unit, and
source category were verified from the current official documents during this
implementation. Store the verification month in a comment beside each catalog
record. Do not create an item if its code cannot be observed in a source file.

Build the matcher around `Map<officialCode, TrackedItem[]>`; a row matches only
one catalog item with the same code and compatible source category. For every
catalog item absent from its expected source category, emit `{ item, reason:
"official-code-not-present" }`.

Write every artifact into a temporary sibling directory, then rename it to
`output/imports/YYYY-MM/`. Create CSV via explicit quoted cells (double any
embedded quote), UTF-8 BOM, stable columns, and decimal numbers using `.`.
Include each selected document URL, SHA-256, format, category, byte length,
and fetch timestamp in the manifest.

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/catalog/matcher.test.ts tests/output/write-import.test.ts`

Expected: PASS.

### Task 5: Orchestrate the CLI, document it, and prove it against YFK

**Files:**
- Create: `src/index.ts`
- Create: `scripts/smoke-live.ts`
- Create: `README.md`
- Modify: `package.json`
- Test: `tests/discovery/monthly-index.test.ts`
- Test: `tests/parsers/price-rows.test.ts`
- Test: `tests/catalog/matcher.test.ts`
- Test: `tests/output/write-import.test.ts`

**Interfaces:**
- Consumes `pnpm fetch -- --year 2026 --month 8 --output-dir output/imports`.
- Produces a nonzero process code for invalid arguments, no selected source, no valid official rows, or malformed source data; produces documented artifacts on success.

- [ ] **Step 1: Write failing CLI validation tests**

```ts
it("rejects a month outside 1 through 12", async () => {
  await expect(runCli(["--year", "2026", "--month", "13"])).rejects.toThrow("month must be between 1 and 12");
});

it("returns a report only after at least one verified official row", async () => {
  await expect(runImport(noRowsDependencies)).rejects.toThrow("No verified official price rows");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/cli.test.ts`

Expected: FAIL because CLI orchestration is not implemented.

- [ ] **Step 3: Implement orchestration and operator documentation**

Parse exactly `--year`, `--month`, and `--output-dir`, defaulting the first two
to the current Istanbul year and month. Print a concise per-category summary:
selected source, parsed rows, matched catalog rows, unmatched catalog rows,
and artifact directory. `scripts/smoke-live.ts` must execute the August 2026
run, assert that all selected URLs use official hosts, and verify that the
result has at least one official row and one parsed source document.

Document Node/pnpm prerequisites; installation; the fetch command; output
schemas; source ranking; rate behavior; no-database scope; known PDF limitation
(image-only PDFs stop with an explicit error); and the live smoke command.

- [ ] **Step 4: Run the full deterministic test suite**

Run: `pnpm typecheck && pnpm test`

Expected: PASS with all unit and fixture-integration tests green.

- [ ] **Step 5: Run the live official-source smoke test**

Run: `pnpm smoke:live`

Expected: PASS after discovering the official August 2026 source dynamically,
writing artifacts under `output/imports/2026-08/`, and reporting at least one
verified official price row. The command must not substitute sample values if
the official source is unavailable.

## Plan Self-Review

- Spec coverage: Tasks 2 and 3 cover dynamic discovery and all required formats;
  Task 4 covers audit files, source-verified exact mapping, JSON/CSV, and
  unmatched results; Task 5 covers the CLI contract, documentation, and live
  validation. No database, UI, scheduling, or analysis task is present.
- Placeholder scan: no deferred implementation markers or generic test steps
  remain; every test step names a command and its expected result.
- Type consistency: all tasks exchange `SourceDocument`, `OfficialPriceRow`,
  and `TrackedItem` from `src/types.ts`; all normalized rows use `priceTry`.
