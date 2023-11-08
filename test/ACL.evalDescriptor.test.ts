import { ACL } from "../src/ACL";
import {
  ArrayDescriptor,
  Descriptor,
  SimpleDescriptorEnum,
} from "../src/Types";

describe("ACL.evalDescriptor()", () => {
  const user = { roles: ["test-role"] };
  const acl = ACL.FromJson({});

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

  it.todo(
    "should return a never-descriptor, if any parent has a never descriptor for the roles of this user"
  );

  it.todo("should be able to handle wild card descriptors");

  it.todo("should properly handle regex roles checks");
});
