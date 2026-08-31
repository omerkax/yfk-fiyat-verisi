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
