import { ACL } from "../src/ACL";
import { SimpleDescriptorEnum } from "../src/Types";

describe("ACL.FromJson()", () => {
  const acl = ACL.FromJson({
    "@custom-variable": SimpleDescriptorEnum.rw,
    example: "@custom-variable",
  });

  describe("ACL.toString()", () => {
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
        `@custom-variable: ${SimpleDescriptorEnum.rw}`,
        "example: @custom-variable",
      ]);
    });
  });

  describe("ACL.toString(true)", () => {
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

  describe("ACL.toJson()", () => {
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

  describe("ACL.toJson(true)", () => {
    it("does not contains the variable, but evaluates it", () => {
      const toJson = acl.toJson(true);
      expect(toJson).toStrictEqual({
        example: SimpleDescriptorEnum.rw,
      });
    });
  });

  describe("ACL.original()", () => {
    it("should return the original input", () => {
      expect(typeof acl.original).toBe("object");
      expect(acl.original).toStrictEqual({
        "@custom-variable": SimpleDescriptorEnum.rw,
        example: "@custom-variable",
      });
    });
  });
});
