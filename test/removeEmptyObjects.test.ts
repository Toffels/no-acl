import { removeEmptyObjects } from "../src/utils/removeEmptyObjects";

describe("removeEmptyObjects", () => {
  it("should remove an empty object from a simple object", () => {
    const input = { a: 1, b: {} };
    const expected = { a: 1 };
    expect(removeEmptyObjects(input) !== input).toBe(true);
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should remove nested empty objects", () => {
    const input = { a: 1, b: { c: {} } };
    const expected = { a: 1 };
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should handle an object with no empty objects", () => {
    const input = { a: 1, b: { c: 2 } };
    const expected = { a: 1, b: { c: 2 } };
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should handle non-object inputs", () => {
    const input = "not an object";
    expect(removeEmptyObjects(input as any)).toEqual(input);
  });

  it("should preserve arrays and null values", () => {
    const input = { a: [], b: null, c: { d: null } };
    const expected = { a: [], b: null, c: { d: null } };
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should handle deeply nested empty objects", () => {
    const input = { a: { b: { c: {} } } };
    const expected = {};
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should handle an object with various data types", () => {
    const input = {
      a: 1,
      b: "string",
      c: [],
      d: null,
      e: undefined,
      f: () => {},
    };
    const expected = {
      a: 1,
      b: "string",
      c: [],
      d: null,
      e: undefined,
      f: input.f,
    };
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should preserve empty arrays", () => {
    const input = { a: [], b: { c: [] } };
    const expected = { a: [], b: { c: [] } };
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should correctly handle falsey values", () => {
    const input = { a: 0, b: false, c: "" };
    const expected = { a: 0, b: false, c: "" };
    expect(removeEmptyObjects(input)).toEqual(expected);
  });

  it("should not remove properties inherited from a prototype", () => {
    const prototype = { inheritedProp: "value" };
    const obj = Object.create(prototype);
    obj.ownProp = { a: 1 };
    const expected = Object.create(prototype);
    expected.ownProp = { a: 1 };
    expect(removeEmptyObjects(obj)).toEqual(expected);
  });

  describe("removeEmptyObjects", () => {
    it("should remove an empty object within an array", () => {
      const input = [{ a: {} }, 1, { b: 2 }];
      const expected = [{}, 1, { b: 2 }];
      expect(removeEmptyObjects(input)).toEqual(expected);
    });

    it("should handle an array within an object", () => {
      const input = { a: [{ b: {} }, 2] };
      const expected = { a: [{}, 2] };
      expect(removeEmptyObjects(input)).toEqual(expected);
    });

    it("should handle deeply nested objects", () => {
      const input = { a: { b: { c: {} } } };
      const expected = {};
      expect(removeEmptyObjects(input)).toEqual(expected);
    });

    it("should handle arrays within arrays", () => {
      const input = [[{ a: {} }, [{ b: {} }]]];
      const expected = [[{}, [{}]]];
      expect(removeEmptyObjects(input)).toEqual(expected);
    });

    it("should handle mixed content in arrays", () => {
      const input = [{ a: {} }, 3, "string", [{ b: {} }, 4]];
      const expected = [{}, 3, "string", [{}, 4]];
      expect(removeEmptyObjects(input)).toEqual(expected);
    });

    it("should handle deep array and object and objects in arrays", () => {
      const input = {
        a: 1,
        b: [{ c: {} }, { d: 2 }, []],
        e: { f: [{ g: {} }, 3] },
        h: [[], [{ i: {} }, { j: 4 }]],
      };
      const expected = {
        a: 1,
        b: [{}, { d: 2 }, []],
        e: { f: [{}, 3] },
        h: [[], [{}, { j: 4 }]],
      };
      expect(removeEmptyObjects(input)).toEqual(expected);
    });
  });

  it("should handle deepness", () => {
    const input = {
      a: { b: { c: { d: { e: { f: {} } } } } },
      b: [{ c: { d: { e: { f: {} } } } }],
    };
    const expected = { b: [{}] };

    expect(removeEmptyObjects(input)).toEqual(expected);
  });
});
