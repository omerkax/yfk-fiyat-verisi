import type { SourceFormat } from "./types.js";

export const OFFICIAL_HOSTS = new Set([
  "yfk.csb.gov.tr",
  "webdosya.csb.gov.tr",
]);

export const OFFICIAL_USER_AGENT = "yfk-price-fetcher/1.0";
export const OFFICIAL_TIMEOUT_MS = 30_000;
export const MONTHLY_INDEX_URL = "https://yfk.csb.gov.tr/aylik-guncel-rayic-ve-birim-fiyat-listeleri-113351";

export function resolveOfficialUrl(value: string, base?: string): string {
  const url = new URL(value, base);
  if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing non-official source URL: ${value}`);
  }
  return url.toString();
}

export const FORMAT_RANK: Record<SourceFormat, number> = {
  xlsx: 0,
  csv: 1,
  html: 2,
  pdf: 3,
};
