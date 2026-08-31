import type { SourceFormat } from "./types.js";

export const OFFICIAL_HOSTS = new Set([
  "yfk.csb.gov.tr",
  "webdosya.csb.gov.tr",
]);

export const OFFICIAL_USER_AGENT = "yfk-price-fetcher/1.0";
export const OFFICIAL_TIMEOUT_MS = 30_000;

export const FORMAT_RANK: Record<SourceFormat, number> = {
  xlsx: 0,
  csv: 1,
  html: 2,
  pdf: 3,
};
