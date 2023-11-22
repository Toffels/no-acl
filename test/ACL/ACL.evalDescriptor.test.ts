import { AccessControlList } from "../../src/AccessControlList";
import { ArrayDescriptor, SimpleDescriptorEnum } from "../../src/Types";

describe("Acl.evalDescriptor()", () => {
  const user = { roles: ["test-role"] };
  const acl = AccessControlList.FromJson({});

  const evalDescriptor = acl["evalDescriptor"].bind(acl);

  it("should should return none descriptor", () => {
    expect(evalDescriptor(undefined, user, SimpleDescriptorEnum.read)[0]).toBe(
      SimpleDescriptorEnum.none
    );
  });

  it("should ignore the explicit none-descriptor and fall through to the non-specific read-descriptor", () => {
    const descriptor: ArrayDescriptor = [
      { d: SimpleDescriptorEnum.readWrite, roles: ["admin"] },
      { d: SimpleDescriptorEnum.none, roles: ["test-role"] },
      { d: SimpleDescriptorEnum.read, roles: ["not-test-role"] },
      SimpleDescriptorEnum.read,
    ];

    expect(
      evalDescriptor(descriptor, user, SimpleDescriptorEnum.read)
    ).toStrictEqual([SimpleDescriptorEnum.read]);
  });

  it("should fall into the never descriptor due to the match of the regex", () => {
    const descriptor: ArrayDescriptor = [
      { d: SimpleDescriptorEnum.readWrite, roles: ["admin"] },
      { d: SimpleDescriptorEnum.never, roles: [/test-.*/] },
      { d: SimpleDescriptorEnum.none, roles: ["test-role"] },
      SimpleDescriptorEnum.read,
    ];

    expect(
      evalDescriptor(descriptor, user, SimpleDescriptorEnum.read)
    ).toStrictEqual([SimpleDescriptorEnum.never, ["test-role"]]);
  });

  it("should return a never-descriptor, if any parent has a never descriptor for the roles of this user", () => {
    const descriptor: ArrayDescriptor = [
      { d: SimpleDescriptorEnum.readWrite, roles: ["admin"] },
      { d: SimpleDescriptorEnum.none, roles: ["test-role"] },
      SimpleDescriptorEnum.read,
      { d: SimpleDescriptorEnum.never, roles: [/test-.*/] },
    ];

    expect(
      evalDescriptor(descriptor, user, SimpleDescriptorEnum.read)
    ).toStrictEqual([SimpleDescriptorEnum.never, ["test-role"]]);
  });

  it("should properly handle regex roles checks", () => {
    const descriptor: ArrayDescriptor = [
      { d: SimpleDescriptorEnum.readWrite, roles: ["admin"] },
      { d: SimpleDescriptorEnum.readWrite, roles: ["other-admin"] },
      { d: SimpleDescriptorEnum.readWrite, roles: ["TenantAdmin"] },
      { d: SimpleDescriptorEnum.read, roles: [/test-.*/] },
      SimpleDescriptorEnum.none,
    ];

    expect(
      evalDescriptor(descriptor, user, SimpleDescriptorEnum.read)
    ).toStrictEqual([SimpleDescriptorEnum.read, ["test-role"]]);
  });
});
