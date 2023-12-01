import { AccessControlList } from "../../src/AccessControlList";
import { SDE } from "../../src/Types";
import { A } from "../../src/zod/AssignAcl";

A;

describe("Acl project", () => {
  it(`should do the correct thing`, () => {
    const user = { roles: [] };

    const acl = AccessControlList.FromJson({
      shouldBeFalse: SDE.never,
      shouldBeTrue: SDE.readWrite,
      "deep.shouldBeTrue": SDE.read,
      deep: SDE.none,
      // Implicitly none:
      // "deep.shouldBeFalse": SDE.read,
      array: SDE.none,
      "array.*": SDE.readWrite,
      "array.*.shouldBeFalse": SDE.never,
      "deep.*.nope.deepest": SDE.never,
      "deep.*.*.deepest": SDE.readWrite,
    });

    const [, removals, , pT] = acl["apply"]({} as any, user, SDE.read, true);

    expect(acl.proj.read("shouldBeFalse", user)).toBe(false);
    expect(acl.proj.read("shouldBeTrue", user)).toBe(true);
    expect(acl.proj.read("deep", user)).toBe(false);
    expect(acl.proj.read("deep.shouldBeFalse", user)).toBe(false);
    expect(acl.proj.read("deep.shouldBeTrue", user)).toBe(true);

    // Array
    expect(acl.proj.read("array", user)).toBe(false);
    expect(acl.proj.read("array.*", user)).toBe(true);
    expect(acl.proj.read("array.test", user)).toBe(true);
    expect(acl.proj.read("array.test2.shouldBeFalse", user)).toBe(false);

    // deeep
    expect(acl.proj.read("deep.*.*", user)).toBe(false);
    expect(acl.proj.read("deep.*.*.deepest", user)).toBe(true);
    expect(acl.proj.read("deep.*.nope.deepest", user)).toBe(false);

    expect(true).toBe(true);
  });
});

describe("Acl project", () => {
  let acl: AccessControlList;
  beforeEach(() => {
    acl = AccessControlList.FromJson({
      shouldBeFalse: SDE.never,
      shouldBeTrue: SDE.readWrite,
      "deep.shouldBeTrue": SDE.read,
      deep: SDE.none,
      array: SDE.none,
      "array.*": SDE.readWrite,
      "array.*.shouldBeFalse": SDE.never,
      "deep.*.nope.deepest": SDE.never,
      "deep.*.*.deepest": SDE.readWrite,
      // Additional rules for complex tests
      "deep.nested.property": SDE.read,
      "array.specificPath": SDE.read,
      "unspecified.path": SDE.none, // default behavior is to deny
      "restricted.path": [
        { d: SDE.none, roles: ["user"] },
        { d: SDE.read, roles: ["admin"] },
      ],
      // for role tests
      ro: SDE.read,
      "ro.le.s": { d: SDE.read, roles: ["admin"] },
    });
  });

  it("should do the correct thing", () => {
    const user = { roles: [] };
    expect(acl.proj.read("ro", user)).toBe(true);
    expect(acl.proj.read("ro.le.s", user)).toBe(false);
  });

  it("should handle admin role correctly", () => {
    const adminUser = { roles: ["admin"] };
    expect(acl.proj.read("ro", adminUser)).toBe(true);
    expect(acl.proj.read("ro.le.s", adminUser)).toBe(true);
  });

  it("should handle regular user role correctly", () => {
    const regularUser = { roles: ["user"] };
    expect(acl.proj.read("ro", regularUser)).toBe(true);
    expect(acl.proj.read("ro.le.s", regularUser)).toBe(false);
  });

  it("should handle complex nested structures", () => {
    const user = { roles: [] };
    expect(acl.proj.read("deep.nested.property", user)).toBe(true);
    // ... more assertions for nested properties
  });

  it("should prioritize specific paths over wildcard paths", () => {
    const user = { roles: [] };
    expect(acl.proj.read("array.specificPath", user)).toBe(true);
    expect(acl.proj.write("array.specificPath", user)).toBe(false);
    expect(acl.proj.read("array.*", user)).toBe(true);
    expect(acl.proj.write("array.*", user)).toBe(true);
  });

  it("should correctly inherit permissions", () => {
    const user = { roles: [] };
    expect(acl.proj.read("deep.inherited", user)).toBe(false);
  });

  it("should respect explicit denials", () => {
    const user = { roles: [] };
    expect(acl.proj.read("path.with.explicit.denial", user)).toBe(false);
  });

  it("should handle paths with no specific rules", () => {
    const user = { roles: [] };
    expect(acl.proj.read("unspecified.path", user)).toBe(false);
  });

  it("should update access when user roles change", () => {
    let user = { roles: ["user"] };
    expect(acl.proj.read("restricted.path", user)).toBe(false);
    user.roles = ["admin"];
    expect(acl.proj.read("restricted.path", user)).toBe(true);
  });

  it("should maintain functionality after serialization and deserialization", () => {
    const user = { roles: [] };
    const serializedAcl = JSON.stringify(acl.toJson());
    const deserializedAcl = AccessControlList.FromJson(
      JSON.parse(serializedAcl)
    );
    expect(deserializedAcl.proj.read("some.path", user)).toBe(false);
  });
});
