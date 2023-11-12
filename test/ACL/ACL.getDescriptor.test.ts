import { ACL } from "../../src/ACL";
import { ArrayDescriptor, SimpleDescriptorEnum } from "../../src/Types";
import { getWildCardPaths } from "../../src/getWildCardPaths";

describe("ACL.getDescriptor()", () => {
  const acl = ACL.FromJson({
    "test.descriptor": SimpleDescriptorEnum.readWrite,
    implicit: SimpleDescriptorEnum.read,
    "pre-defined-variable.descriptor": "@write",
    "@custom-var": {
      d: SimpleDescriptorEnum.readWrite,
      roles: ["test-role"],
    },
    "custom-variable.descriptor": "@custom-var",
  });

  const getDescriptor = acl["getDescriptor"].bind(acl);

  it("should find a classic defined the descriptor", () => {
    const descriptor = getDescriptor("test.descriptor");
    expect(descriptor).toBe(SimpleDescriptorEnum.readWrite);
  });

  it("should find a descriptor by implicit inheritance", () => {
    const descriptor = getDescriptor("implicit.descriptor");
    expect(descriptor).toBe(SimpleDescriptorEnum.read);
  });

  it("should find a descriptor by implicit inheritance, even if it's deep and runs through an array", () => {
    const descriptor = getDescriptor(
      "implicit.descriptor.3.object-in-array.which-additionally-is-deep"
    );
    expect(descriptor).toBe(SimpleDescriptorEnum.read);
  });

  it("should not find a descriptor, if it or it's implicit parent does not exist", () => {
    const descriptor = getDescriptor("not-existing.implicit.descriptor");
    expect(descriptor).toBe(undefined);
  });

  it("should resolve a predefined variable", () => {
    const descriptor = getDescriptor("pre-defined-variable.descriptor");
    expect(descriptor).not.toBe("@write");
    expect(descriptor).toBe(SimpleDescriptorEnum.write);
  });

  it("should resolve a custom variable", () => {
    const descriptor = getDescriptor("custom-variable.descriptor");
    expect(descriptor).not.toBe("@write");
    expect(descriptor).toStrictEqual({
      d: SimpleDescriptorEnum.readWrite,
      roles: ["test-role"],
    });
  });

  describe("ACL.getDescriptor() // wildcards", () => {
    const acl = ACL.FromJson({
      root: SimpleDescriptorEnum.readWrite,
      "root.*.test1": SimpleDescriptorEnum.read,
      "root.test2": [{ d: SimpleDescriptorEnum.never, roles: ["test2"] }],
      "root.*": [{ d: SimpleDescriptorEnum.write, roles: ["test3"] }],
    });

    const getDescriptor = acl["getDescriptor"].bind(acl);

    // Test with original key "root.test1.test1"
    {
      const key = "root.test1.test1";
      it(`should find descriptor for nested wildcard path "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([SimpleDescriptorEnum.read]);
      });
    }

    // Test with original key "root.test2"
    {
      const key = "root.test2";
      it(`should find descriptor for exact match "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual(acl.original["root.test2"]);
      });
    }

    // Test with original key "root.test3"
    {
      const key = "root.test3";
      it(`should find descriptor for single-level wildcard path "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual(
          // "root.*": [{ d: SimpleDescriptorEnum.write, roles: ["test3"] }],
          acl.original["root.*"]
        );
      });
    }

    // Test with deeper nested wildcard path
    {
      const key = "root.some.deep.test1";
      it(`should find descriptor for deeper nested wildcard path "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([
          ...(acl.original["root.*"] as ArrayDescriptor),
        ]);
      });
    }

    // Test with a path that matches multiple wildcards
    {
      const key = "root.some.test1";
      it(`should find descriptor for path matching multiple wildcards "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([SimpleDescriptorEnum.read]);
      });
    }

    // Test with a path that matches no wildcards
    {
      const key = "root.unknown.path";
      it(`should not find any descriptor for unmatched path "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([
          ...(acl.original["root.*"] as ArrayDescriptor),
        ]);
      });
    }

    {
      const key = "root.asd";
      it(`should never get the parent root definition "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).not.toStrictEqual(acl.original["root"]);
      });
    }

    // Test with exact match overriding wildcard
    {
      const key = "root.test2";
      it(`should prioritize exact match over wildcard for "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual(acl.original["root.test2"]);
      });
    }

    // Test with leading wildcard
    {
      const key = "*.test1";
      it(`should handle leading wildcard in "${key}" by returning undefined`, () => {
        const des = getDescriptor(key);
        expect(des).toBe(undefined);
      });
    }

    {
      const acl = ACL.FromJson({
        "*.l1": SimpleDescriptorEnum.write,
      });

      const getDescriptor = acl["getDescriptor"].bind(acl);

      it(`should handle leading wildcard in "key.l1" for "*.l1"`, () => {
        const des = getDescriptor("key.l1");
        expect(des).toStrictEqual([SimpleDescriptorEnum.w]);
      });
    }
  });

  describe("ACL.getDescriptor() // wildcards 2", () => {
    const acl = ACL.FromJson({
      "a.*": SimpleDescriptorEnum.readWrite,
      "a.*.*": SimpleDescriptorEnum.readWrite,
      "b.test*": SimpleDescriptorEnum.readWrite,
      "b.test-*": SimpleDescriptorEnum.readWrite,
    });

    const getDescriptor = acl["getDescriptor"].bind(acl);

    {
      const key = "a.b.c";
      it(`should "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([SimpleDescriptorEnum.readWrite]);
      });
    }

    {
      const key = "b.test";
      it(`should "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([SimpleDescriptorEnum.readWrite]);
      });

      const desResolver = getDescriptor(key, true);
      expect(desResolver).toStrictEqual(["b.test*"]);
    }

    {
      const key = "b.test-and-so-on";
      it(`should handle a wildcard of this shape: 'b.test*' with key "${key}"`, () => {
        const des = getDescriptor(key);
        expect(des).toStrictEqual([
          SimpleDescriptorEnum.readWrite,
          SimpleDescriptorEnum.readWrite,
        ]);

        const desResolver = getDescriptor(key, true);
        expect(desResolver).toStrictEqual(["b.test*", "b.test-*"]);
      });
    }
  });
});
