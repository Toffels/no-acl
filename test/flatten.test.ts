import { flatten } from "../src/utils/utils";

describe("flatten", () => {
  it("should flatten an object with nested objects", () => {
    const nestedObj = {
      a: 1,
      b: { c: 2, d: { e: 3 } },
      f: true,
    };
    const flatObj = flatten(nestedObj);
    expect(flatObj).toEqual({
      a: 1,
      b: {},
      "b.c": 2,
      "b.d": {},
      "b.d.e": 3,
      f: true,
    });
  });

  it("should handle an already flat object", () => {
    const flatObj = { a: 1, b: 2, c: true };
    expect(flatten(flatObj)).toEqual(flatObj);
  });

  it("should handle an empty object", () => {
    expect(flatten({})).toEqual({});
  });

  it("should correctly handle different types of values", () => {
    const mixedObj = {
      a: "hello",
      b: { c: null, d: false },
      e: [1, 2, 3], // Arrays are objects and would be a special case, should be considered based on requirements
    };
    const expectedResult = {
      a: "hello",
      b: {},
      "b.c": null, // assuming null should be flattened as well
      "b.d": false,
      e: [],
      "e.0": 1,
      "e.1": 2,
      "e.2": 3,
    };
    expect(flatten(mixedObj)).toEqual(expectedResult);
  });

  it("should handle a straight array as input", () => {
    const arrayInput = [1, 2, { a: 3, b: [4, 5] }];
    const expectedOutput = {
      "0": 1,
      "1": 2,
      "2": {},
      "2.a": 3,
      "2.b": [],
      "2.b.0": 4,
      "2.b.1": 5,
    };
    expect(flatten(arrayInput as any)).toEqual(expectedOutput);
  });

  it("should flatten an object containing arrays", () => {
    const objWithArrays = {
      numbers: [1, 2, 3],
      details: {
        name: "Test",
        values: [4, 5, 6],
      },
    };
    const expectedOutput = {
      numbers: [],
      "numbers.0": 1,
      "numbers.1": 2,
      "numbers.2": 3,
      details: {},
      "details.name": "Test",
      "details.values": [],
      "details.values.0": 4,
      "details.values.1": 5,
      "details.values.2": 6,
    };
    expect(flatten(objWithArrays)).toEqual(expectedOutput);
  });

  it("should throw an error for string input", () => {
    const stringInput = "test";
    expect(() => flatten(stringInput as any)).toThrow();
  });

  it("should throw an error for number input", () => {
    const numberInput = 42;
    expect(() => flatten(numberInput as any)).toThrow();
  });

  it("should throw an error for boolean input", () => {
    const booleanInput = true;
    expect(() => flatten(booleanInput as any)).toThrow();
  });

  it("should throw an error for null input", () => {
    expect(() => flatten(null as any)).toThrow();
  });

  it("should throw an error for undefined input", () => {
    expect(() => flatten(undefined as any)).toThrow();
  });

  it("should not throw an error for an object input", () => {
    const objectInput = { a: 1, b: { c: 2 } };
    expect(() => flatten(objectInput)).not.toThrow();
  });

  it("should not throw an error for an array input", () => {
    const arrayInput = [1, 2, 3];
    expect(() => flatten(arrayInput as any)).not.toThrow();
  });

  it("should only hold the path to the base types", () => {
    const keys = Object.keys(
      flatten({ deep: { deeper: { deepest: "deepest" } } })
    );
    expect(keys).toContain("deep");
    expect(keys).not.toContain("deeper");
    expect(keys).toContain("deep.deeper");
    expect(keys).toContain("deep.deeper.deepest");
  });
});
