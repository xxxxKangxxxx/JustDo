import { describe, expect, it } from "vitest";
import { mergeTags, parseTagInput } from "./tags";

describe("parseTagInput", () => {
  it("trims and drops empty fragments", () => {
    expect(parseTagInput("  work , urgent ,  ")).toEqual(["work", "urgent"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseTagInput("   ")).toEqual([]);
    expect(parseTagInput(",,,")).toEqual([]);
  });

  it("preserves a single non-comma string", () => {
    expect(parseTagInput("work")).toEqual(["work"]);
  });
});

describe("mergeTags", () => {
  it("appends new tags in insertion order", () => {
    expect(mergeTags(["work"], ["urgent", "ops"])).toEqual([
      "work",
      "urgent",
      "ops",
    ]);
  });

  it("ignores duplicates already in the list", () => {
    expect(mergeTags(["work"], ["work", "urgent"])).toEqual(["work", "urgent"]);
  });

  it("returns a new array", () => {
    const current = ["work"];
    const next = mergeTags(current, ["urgent"]);
    expect(next).not.toBe(current);
    expect(current).toEqual(["work"]);
  });
});
