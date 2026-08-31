import type { OfficialPriceRow, TrackedItem, UnmatchedTrackedItem } from "../types.js";

export interface MatchedTrackedItem {
  item: TrackedItem;
  row: OfficialPriceRow;
}

export interface TrackedItemMatchResult {
  matched: OfficialPriceRow[];
  matchedItems: MatchedTrackedItem[];
  unmatched: UnmatchedTrackedItem[];
}

export function matchTrackedItems(
  rows: readonly OfficialPriceRow[],
  items: readonly TrackedItem[],
): TrackedItemMatchResult {
  const byOfficialCode = new Map<string, TrackedItem[]>();
  const matchedIds = new Set<string>();
  const matched: OfficialPriceRow[] = [];
  const matchedItems: MatchedTrackedItem[] = [];

  for (const item of items) {
    const withCode = byOfficialCode.get(item.officialCode) ?? [];
    withCode.push(item);
    byOfficialCode.set(item.officialCode, withCode);
  }

  for (const row of rows) {
    const item = byOfficialCode.get(row.officialCode)?.find((candidate) => (
      candidate.sourceCategory === row.category && !matchedIds.has(candidate.id)
    ));
    if (!item) continue;

    matchedIds.add(item.id);
    matched.push(row);
    matchedItems.push({ item, row });
  }

  return {
    matched,
    matchedItems,
    unmatched: items
      .filter((item) => !matchedIds.has(item.id))
      .map((item) => ({ item, reason: "official-code-not-present" })),
  };
}
