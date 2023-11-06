import * as z from "zod";

const ZTest = z.object({
  union: z.union([
    z.object({
      a: z.number(),
    }),
    z.object({
      b: z.number(),
    }),
  ]),
});

export type Test = z.infer<typeof ZTest>;

describe("ZTest Schema", () => {
  it('should validate an object with a number "a" property', () => {
    const validDataA: Test = { union: { a: 1 } };
    const resultA = ZTest.safeParse(validDataA);
    expect(resultA.success).toBe(true);
  });

  it('should validate an object with a number "b" property', () => {
    const validDataB: Test = { union: { b: 2 } };
    const resultB = ZTest.safeParse(validDataB);
    expect(resultB.success).toBe(true);
  });

  it('should validate an object with both "a" and "b" properties', () => {
    const invalidData = <Test>{ union: { a: 1, b: 2 } };
    const result = ZTest.safeParse(invalidData);
    expect(result.success).toBe(true);
  });

  it('should not validate an object with missing "a" and "b" properties', () => {
    const invalidData = { union: {} };
    const result = ZTest.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should not validate an object with non-number "a" or "b" properties', () => {
    const invalidDataA = { union: { a: "string" } };
    const invalidDataB = { union: { b: "string" } };
    const resultA = ZTest.safeParse(invalidDataA);
    const resultB = ZTest.safeParse(invalidDataB);
    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(false);
  });
});
