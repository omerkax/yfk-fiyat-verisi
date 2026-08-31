export const SOURCE_CATEGORIES = [
  "construction-rayic",
  "mechanical-rayic",
  "electrical-rayic",
  "construction-unit-price",
  "mechanical-unit-price",
  "electrical-unit-price",
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];
export type SourceFormat = "xlsx" | "csv" | "html" | "pdf";

export interface SourceDocument {
  year: number;
  month: number;
  category: SourceCategory;
  sourceUrl: string;
  format: SourceFormat;
  discoveredFromUrl: string;
}

export interface OfficialPriceRow {
  officialCode: string;
  officialName: string;
  unit: string;
  priceTry: number;
  year: number;
  month: number;
  category: SourceCategory;
  sourceUrl: string;
}

export interface TrackedItem {
  id: string;
  displayName: string;
  category: string;
  officialCode: string;
  officialName: string;
  unit: string;
  sourceCategory: SourceCategory;
}

export interface ImportManifestDocument extends SourceDocument {
  sha256: string;
  byteLength: number;
  fetchedAt: string;
}

export interface ImportManifest {
  year: number;
  month: number;
  fetchedAt: string;
  documents: ImportManifestDocument[];
}

export interface UnmatchedTrackedItem {
  item: TrackedItem;
  reason: string;
}
