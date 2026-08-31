import { describe, expect, it } from "vitest";
import { matchTrackedItems } from "../../src/catalog/matcher.js";
import type { OfficialPriceRow, TrackedItem } from "../../src/types.js";

const row = (officialCode: string, category: OfficialPriceRow["category"] = "construction-rayic"): OfficialPriceRow => ({
  officialCode,
  officialName: "Taşcı ustası",
  unit: "Sa",
  priceTry: 354.41,
  year: 2026,
  month: 8,
  category,
  sourceUrl: "https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.pdf",
});

const item = (officialCode: string, sourceCategory: TrackedItem["sourceCategory"] = "construction-rayic"): TrackedItem => ({
  id: "construction-stone-mason",
  displayName: "Taşcı ustası",
  category: "construction-labor",
  officialCode,
  officialName: "Taşcı ustası",
  unit: "Sa",
  sourceCategory,
});

describe("tracked item matcher", () => {
  it("matches only an exact official code", () => {
    const result = matchTrackedItems([row("10.100.1001")], [item("10.100.1001")]);

    expect(result.matched).toEqual([row("10.100.1001")]);
    expect(result.matchedItems).toHaveLength(1);
    expect(result.matchedItems[0]).toMatchObject({
      item: { id: "construction-stone-mason", displayName: "Taşcı ustası" },
      row: { officialCode: "10.100.1001", priceTry: 354.41 },
    });
    expect(matchTrackedItems([row("10.100.1001")], [item("10.100.1002")]).matched).toHaveLength(0);
  });

  it("requires the tracked item source category and reports it when absent", () => {
    const tracked = item("10.100.1001", "construction-unit-price");
    const result = matchTrackedItems([row("10.100.1001")], [tracked]);

    expect(result.matched).toEqual([]);
    expect(result.matchedItems).toEqual([]);
    expect(result.unmatched).toEqual([{ item: tracked, reason: "official-code-not-present" }]);
  });
});
