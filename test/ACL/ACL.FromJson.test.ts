import { AccessControlList } from "../../src/AccessControlList";
import { SimpleDescriptorEnum, SpecialDescriptor } from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";

describe("Acl.FromJson()", () => {
  const acl = AccessControlList.FromJson({
    "@custom-variable": SimpleDescriptorEnum.rw,
    example: "@custom-variable",
  });

  it("should parse regex role check accordingly", () => {
    const acl = AccessControlList.FromJson({
      test_xx: { d: SimpleDescriptorEnum.rw, roles: [/any/] },
    });

    const json = acl.toJson();
    const acl2 = AccessControlList.FromJson(json);

    expect(acl.original).toStrictEqual(acl2.original);
    expect(acl.toString()).toStrictEqual(acl2.toString());

    expect(acl.toJson()).toStrictEqual(acl2.toJson());
    expect(getValueByPath(acl2.original, "test_xx.roles.0")).toBeInstanceOf(
      RegExp
    );
  });

  it("should serialize regex properly", () => {
    const acl = AccessControlList.FromJson({
      test_xx: { d: SimpleDescriptorEnum.rw, roles: [/any/] },
    });

    const json = acl.toJson();

    expect((json.test_xx as SpecialDescriptor).roles).toStrictEqual([
      "regex#any#",
    ]);
  });

  describe("Acl.toString()", () => {
    it("should return a string", () => {
      const toString = acl.toString();
      expect(typeof toString).toBe("string");
    });

    it("contains the variables", () => {
      const toString = acl.toString();
      expect(toString.length).toBeGreaterThan(0);
      const lines = toString.split("\n");
      expect(lines.length).toBeGreaterThan(0);
      expect(lines).toStrictEqual([
        "example: @custom-variable",
        `@custom-variable: ${SimpleDescriptorEnum.rw}`,
      ]);
    });
  });

  describe("Acl.toString(true)", () => {
    it("does not contains the variable, but evaluates it", () => {
      const toString = acl.toString(true);
      expect(toString.length).toBeGreaterThan(0);
      const lines = toString.split("\n");
      expect(lines.length).toBeGreaterThan(0);
      expect(lines).toStrictEqual([
        // Line
        `example: ${SimpleDescriptorEnum.rw}`,
      ]);
    });
  });

  describe("Acl.toJson()", () => {
    it("should return a object", () => {
      const toString = acl.toJson();
      expect(typeof toString).toBe("object");
    });

    it("contains the variable", () => {
      const toJson = acl.toJson();
      expect(toJson).toStrictEqual({
        "@custom-variable": SimpleDescriptorEnum.rw,
        example: "@custom-variable",
      });
    });
  });

  describe("Acl.toJson(true)", () => {
    it("does not contains the variable, but evaluates it", () => {
      const toJson = acl.toJson(true);
      expect(toJson).toStrictEqual({
        example: SimpleDescriptorEnum.rw,
      });
    });
  });

  describe("Acl.original()", () => {
    it("should return the original input", () => {
      expect(typeof acl.original).toBe("object");
      expect(acl.original).toStrictEqual({
        "@custom-variable": SimpleDescriptorEnum.rw,
        example: "@custom-variable",
      });
    });
  });
});
