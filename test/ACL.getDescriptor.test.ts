import { ACL } from "../src/ACL";
import { SimpleDescriptorEnum } from "../src/Types";

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

  it.todo(
    "should be able to find the descriptor, if it had been specified with a wild card."
    // () => {}
  );
});
