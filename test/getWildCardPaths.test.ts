import { getWildCardPaths } from "../src/getWildCardPaths";

describe("getWildCardPaths", () => {
  const keys = [
    "a",
    "a.k",
    "a.k.k",
    "a.*.d",
    "a.*.*.t",
    //
    "root.*",
    "root.*.test1",
  ];

  it("should find the matching wild card paths", () => {
    expect(getWildCardPaths("b.s.d", keys)).toBe(null);
    expect(getWildCardPaths("a.s.d", keys)?.toString()).toBe("a.*.d");
    expect(getWildCardPaths("a.s.z.t", keys)?.toString()).toBe("a.*.*.t");
    expect(getWildCardPaths("a.s.d.t", keys)?.toString()).toBe("a.*.*.t");
  });

  it("should find the matching wild card paths 2", () => {
    expect(getWildCardPaths("root.test1.test1", keys)?.toString()).toBe(
      "root.*.test1"
    );
  });

  it("should handle deepness correctly", () => {
    expect(getWildCardPaths("root.some.thing.really.deep.test1", keys)).toBe(
      null
    );
    expect([
      getWildCardPaths("root.some.thing.really.deep.test1", keys),
    ]).not.toContain("root.*.test1");
  });

  it("should handle deepness correctly", () => {
    expect(getWildCardPaths("root.not.te", keys)).toBe(null);
    expect([getWildCardPaths("root.not.te", keys)]).not.toContain(
      "root.*.test1"
    );
  });
});

// If multiple wild-card keys where found ...
// Which should be used??
