import { load } from "cheerio";
import { FORMAT_RANK, resolveOfficialUrl } from "../config.js";
import type { SourceCategory, SourceDocument, SourceFormat } from "../types.js";
import type { MonthEntry } from "./monthly-index.js";

export interface DiscoveryPage {
  html: string;
  attachmentContentTypes?: Record<string, string>;
}

export type FetchText = (url: string) => Promise<string | DiscoveryPage>;

const CATEGORY_PATTERNS: Array<[SourceCategory, RegExp]> = [
  ["construction-rayic", /insaat.*rayic/],
  ["mechanical-rayic", /mekanik.*rayic/],
  ["electrical-rayic", /elektrik.*rayic/],
  ["construction-unit-price", /insaat.*birim.*fiyat/],
  ["mechanical-unit-price", /mekanik.*birim.*fiyat/],
  ["electrical-unit-price", /elektrik.*birim.*fiyat/],
];

const normalizeLabel = (value: string) => value
  .replace(/<[^>]+>/g, " ")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ı/g, "i")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "")
  .trim();

function sourceCategory(label: string): SourceCategory | undefined {
  const normalized = normalizeLabel(label);
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0];
}

function sourceFormat(url: string, contentType?: string): SourceFormat | undefined {
  const normalizedContentType = contentType?.toLowerCase() ?? "";
  if (normalizedContentType.includes("spreadsheetml") || normalizedContentType.includes("ms-excel")) return "xlsx";
  if (normalizedContentType.includes("text/csv")) return "csv";
  if (normalizedContentType.includes("text/html")) return "html";
  if (normalizedContentType.includes("application/pdf")) return "pdf";

  const extension = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (extension === "xlsx" || extension === "csv" || extension === "pdf") return extension;
  if (extension === "html" || extension === "htm") return "html";
  return undefined;
}

export function selectPreferredDocuments(documents: SourceDocument[]): SourceDocument[] {
  const preferred = new Map<SourceCategory, SourceDocument>();
  for (const document of documents) {
    const current = preferred.get(document.category);
    if (!current || FORMAT_RANK[document.format] < FORMAT_RANK[current.format]) {
      preferred.set(document.category, document);
    }
  }
  return [...preferred.values()];
}

export async function discoverMonthlyDocuments(
  entry: MonthEntry,
  fetchText: FetchText,
): Promise<SourceDocument[]> {
  if (entry.kind === "document") return [];

  const page = await fetchText(entry.url);
  const { html, attachmentContentTypes = {} } = typeof page === "string" ? { html: page } : page;
  const $ = load(html);
  const documents: SourceDocument[] = [];

  $("a[href]").each((_, element) => {
    const category = sourceCategory($(element).text());
    const href = $(element).attr("href");
    if (!category || !href) return;

    let sourceUrl: string;
    try {
      sourceUrl = resolveOfficialUrl(href, entry.url);
    } catch {
      return;
    }
    const format = sourceFormat(sourceUrl, attachmentContentTypes[sourceUrl] ?? $(element).attr("type"));
    if (!format) return;

    documents.push({
      year: entry.year,
      month: entry.month,
      category,
      sourceUrl,
      format,
      discoveredFromUrl: entry.url,
    });
  });

  return selectPreferredDocuments(documents);
}
