import { setValueByPath, getValueByPath } from "../src/utils";

describe("setValueByPath", () => {
  it("should throw on invalid data input", () => {
    expect(() => setValueByPath(null as any, "anything", null)).toThrow();
    expect(() => setValueByPath(undefined as any, "anything", null)).toThrow();
    expect(() => setValueByPath(1 as any, "anything", null)).toThrow();
    expect(() => setValueByPath("test" as any, "anything", null)).toThrow();
    expect(() => setValueByPath(true as any, "anything", null)).toThrow();
  });

  it("should set a value by path", () => {
    const data = {};

    setValueByPath(data, "some.deeper.path", 1);
    expect(data).toStrictEqual({ some: { deeper: { path: 1 } } });

    setValueByPath(data, "some.deeper.path", 2);
    expect(data).toStrictEqual({ some: { deeper: { path: 2 } } });

    setValueByPath(data, "some.deeper.added", 2);
    expect(data).toStrictEqual({ some: { deeper: { path: 2, added: 2 } } });
  });

  it("should set a value by path and create an array if required", () => {
    const data = {};

    setValueByPath(data, "root.1.data", 1);
    expect(data).toStrictEqual({ root: [, { data: 1 }] });
  });

  it("should set a value by path and even if an array is in its way", () => {
    const data = { root: [0, 1, 2, 3, 4] };

    // Cannot assign property to number.
    expect(() => setValueByPath(data, "root.1.data", 2)).toThrow();

    setValueByPath(data, "root.5.data", 5);
    expect(data).toStrictEqual({ root: [0, 1, 2, 3, 4, { data: 5 }] });
    setValueByPath(data, "root.2", -2);
    expect(data).toStrictEqual({ root: [0, 1, -2, 3, 4, { data: 5 }] });
  });

  it("should overwrite a deeper value without affecting other properties", () => {
    const data = { level1: { level2: { prop1: "value1", prop2: "value2" } } };

    setValueByPath(data, "level1.level2.prop1", "newValue");
    expect(data).toStrictEqual({
      level1: { level2: { prop1: "newValue", prop2: "value2" } },
    });
  });

  it("should handle setting a value on a non-existent deep path", () => {
    const data = { existing: { path: "value" } };

    setValueByPath(data, "non.existing.path", "new value");
    expect(data).toStrictEqual({
      existing: { path: "value" },
      non: { existing: { path: "new value" } },
    });
  });

  it("should not create an array for numeric keys if the container is an object", () => {
    const data = { obj: {} };

    setValueByPath(data, "obj.0.property", "zero");
    expect(Array.isArray(data.obj)).toBe(false);
    expect(data).toStrictEqual({ obj: { "0": { property: "zero" } } });
  });
});

describe("getValueByPath", () => {
  it("should throw on invalid data input", () => {
    expect(() => getValueByPath(null as any, "anything")).toThrow();
    expect(() => getValueByPath(undefined as any, "anything")).toThrow();
    expect(() => getValueByPath(1 as any, "anything")).toThrow();
    expect(() => getValueByPath("test" as any, "anything")).toThrow();
    expect(() => getValueByPath(true as any, "anything")).toThrow();
  });

  it("should be able to return deep property", () => {
    const data = {
      deep: {
        deeper: {
          deepest: 3,
          deepestObj: {
            not: "interesting",
          },
        },
      },
    };

    expect(getValueByPath(data, "deep.deeper.deepest")).toBe(
      data.deep.deeper.deepest
    );
    expect(getValueByPath(data, "deep.deeper.deepestObj")).toStrictEqual(
      data.deep.deeper.deepestObj
    );
  });

  it("should be able to return deep property even though an array is involved", () => {
    const data = {
      deep: {
        deeper: {
          deepest: [
            {},
            {
              not: "interesting",
            },
          ],
        },
      },
    };

    expect(getValueByPath(data, "deep.deeper.deepest.1.not")).toStrictEqual(
      data.deep.deeper.deepest[1].not
    );
  });

  it("should return undefined for a non-existent path", () => {
    const data = { some: "data" };

    expect(getValueByPath(data, "non.existent.path")).toBeUndefined();
  });

  it("should return the whole object if the path is empty", () => {
    const data = { some: "data" };

    expect(getValueByPath(data, "")).toStrictEqual(data);
  });

  it("should handle paths that point to arrays", () => {
    const data = { items: ["one", "two", "three"] };

    expect(getValueByPath(data, "items.0")).toBe("one");
    expect(getValueByPath(data, "items.1")).toBe("two");
    expect(getValueByPath(data, "items")).toStrictEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("should return undefined for out of bounds array indices", () => {
    const data = { items: ["one", "two", "three"] };

    expect(getValueByPath(data, "items.3")).toBeUndefined();
  });

  it("should return undefined if a property in the path is undefined", () => {
    const data = { existing: undefined };

    expect(getValueByPath(data, "existing.nonExistent")).toBeUndefined();
  });

  it("should return undefined for a null property in the path", () => {
    const data = { level1: { level2: null } };

    expect(getValueByPath(data, "level1.level2.nonExistent")).toBeUndefined();
  });

  // AI: Ensuring that non-object/array keys in the middle of a path do not throw an error
  it("should handle non-object/array keys in the path gracefully", () => {
    const data = { level1: { level2: "I am a string, not an object" } };

    expect(getValueByPath(data, "level1.level2.property")).toBeUndefined();
  });

  // AI: Testing the retrieval of a property with a number in its name
  it("should be able to retrieve properties with numbers in their names", () => {
    const data = { level1: { "2level": { property: "We've got numbers" } } };

    expect(getValueByPath(data, "level1.2level.property")).toBe(
      "We've got numbers"
    );
  });
});

describe("setValueByPath behavior for undefined values", () => {
  it("should delete the property when set to undefined", () => {
    const data = {
      level1: {
        level2: {
          level3: "value",
        },
      },
    };

    // Set the property to undefined
    setValueByPath(data, "level1.level2.level3", undefined);

    // Check that the property has been deleted
    expect(data.level1.level2.hasOwnProperty("level3")).toBe(false);
  });

  it("should not create new property if setting undefined to non-existent path", () => {
    const data: Record<string, any> = {
      level1: {
        level2: {},
      },
    };

    // Try to set a non-existent property to undefined
    setValueByPath(data, "level1.level2.nonExistent", undefined);

    // Check that the non-existent property was not created
    expect(data.level1.level2.hasOwnProperty("nonExistent")).toBe(false);
  });

  it("should properly delete the property if nested within an array", () => {
    const data = {
      level1: {
        level2: [{}, { level3: "value" }],
      },
    };

    // Set the property to undefined
    setValueByPath(data, "level1.level2.1.level3", undefined);

    // Check that the property has been deleted from the specific array element
    expect(data.level1.level2[1].hasOwnProperty("level3")).toBe(false);
  });
});
