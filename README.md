# YFK monthly price data fetcher

This TypeScript CLI dynamically discovers the requested month on the official
Yüksek Fen Kurulu (YFK) index, downloads the selected official source documents,
parses verified price rows, matches the versioned tracked-item catalog by exact
official code, and writes auditable JSON/CSV artifacts.

A separate, self-contained web dashboard (`index.html`, served by
`scripts/serve.ts`) reads those artifacts and presents them: an overview, the
tracked catalog, a month-by-month price table, a curated **KOBİ Müteahit** core
cost list, and an editable **m² construction cost** estimate. The fetch CLI
itself stays pure — no database, scheduler, or prediction logic.

## Hızlı başlangıç / Quick start

```sh
git clone <repo-url>
cd "fiyat verisi"
pnpm install            # or: npm install
pnpm dev                # or: npm run dev
```

Then open **http://localhost:3000**. On a fresh clone there is no data yet — click
the **“Veri Çek”** button (top-right) to download a month's official YFK data, or
run `pnpm fetch` from the terminal (see below). Fetched months appear in the
period selector automatically.

## Prerequisites and installation

- Node.js 22 or newer
- pnpm 10 or newer (npm also works)
- HTTPS access to `yfk.csb.gov.tr` and `webdosya.csb.gov.tr`

Install the locked dependencies:

```sh
pnpm install --frozen-lockfile
```

## Dashboard (panel)

```sh
pnpm dev
```

Serves the dashboard on `http://localhost:3000` with these tabs:

- **Genel Bakış** — totals, category breakdown for the selected month.
- **Katalog İzleme** — the exact-code tracked catalog matches.
- **KOBİ Müteahit** — curated core cost items (labour, concrete, rebar,
  excavation, formwork, masonry, …), grouped, month-by-month.
- **m² Maliyet** — approximate structural cost per m²; edit each item's
  quantity-per-m² and the total updates live. Prices are VAT-excluded.
- **Aylık Fiyat Tablosu** — every poz with one price column per fetched month.
- **Kaynak Denetimi** — source document manifest with SHA-256 hashes.

The **Veri Çek** button (and `POST /api/fetch?year=&month=`) runs the same import
pipeline as the CLI. All prices shown are **KDV hariç / VAT-excluded**, exactly as
published by YFK (unit prices already include 25% contractor profit + overhead;
rayiç are bare input costs).

## Fetch an import

```sh
pnpm fetch -- --year 2026 --month 8 --output-dir output/imports
```

Only `--year`, `--month`, and `--output-dir` are accepted. Year and month default
to the current `Europe/Istanbul` calendar period, and the output base defaults to
`output/imports`. The command above publishes to `output/imports/2026-08/`.
A completed import at that path is never overwritten; choose another base or
move the existing import before retrying.

The command exits nonzero for invalid arguments, a missing monthly source, no
verified official rows, malformed source data, HTTP errors, or a publish error.
Its final console output is a concise six-category summary with the selected
source, parsed row count, matched and unmatched catalog counts, followed by the
artifact directory.

## Output files and schemas

Every successful `output/imports/YYYY-MM/` directory contains:

- `manifest.json`: `{ year, month, fetchedAt, documents[] }`; every document
  records its official URL, discovery URL, category, format, SHA-256, byte
  length, and fetch timestamp.
- `official-price-rows.json`: all verified rows as
  `{ officialCode, officialName, unit, priceTry, year, month, category, sourceUrl }`.
- `official-price-rows.csv`: the same official rows with a UTF-8 BOM and quoted
  columns.
- `tracked-prices.json`: exact-code catalog matches, retaining both the tracked
  item and its official row.
- `unmatched-tracked-items.json`: catalog items not present in a verified row,
  with a reason.

Files are built in a temporary sibling directory and published together, so a
partial import is not presented as complete.

## Source selection and integrity

Discovery always starts at the official monthly index. Announcement pages can
provide six category-specific documents: construction, mechanical, and
electrical rayiç and unit-price sources. When alternatives exist for a category,
the ranking is `XLSX > CSV > HTML > PDF`.

A direct monthly index entry may instead be one combined official document. It
is downloaded once and appears once in `manifest.json` with category `combined`.
Only rows whose official code begins with a known two-digit family are assigned:
`10` construction rayiç, `15` construction unit price, `20` mechanical rayiç,
`25` mechanical unit price, `30` electrical rayiç, and `35` electrical unit
price. Unknown families are omitted and reported; category names are never
guessed from row text.

Only HTTPS URLs on the two official hosts are accepted, including redirects.
Downloads are sequential to avoid bursts, use a 30-second timeout, identify the
client with `yfk-price-fetcher/1.0`, and stop after five redirects.

PDF parsing extracts embedded text only. OCR is out of scope: an image-only PDF
stops with an explicit `Image-only PDF is unsupported` error instead of
substituting or guessing values.

## Verification

Run deterministic checks:

```sh
pnpm typecheck
pnpm test
```

Run the live August 2026 official-source smoke test:

```sh
pnpm smoke:live
```

The smoke test performs fresh dynamic discovery, permits only official hosts,
writes to `output/imports/2026-08/`, and requires at least one parsed source
document and one verified official row. It never substitutes fixtures or sample
prices when official network access or source parsing fails.
