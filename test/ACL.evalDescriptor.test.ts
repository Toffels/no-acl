import { ACL } from "../src/ACL";
import { SimpleDescriptorEnum } from "../src/Types";

describe("ACL.evalDescriptor()", () => {
  const user = { roles: ["test-role"] };
  const acl = ACL.FromJson({});

  const evalDescriptor = acl["evalDescriptor"].bind(acl);

  it("should should return none descriptor", () => {
    expect(evalDescriptor(undefined, user)[0]).toBe(SimpleDescriptorEnum.none);
  });

  it.todo(
    "should put out a none-descriptor, of an array-descriptor, if one of the earlier roles fits a user and the descriptor value is none"
  );

  it.todo(
    "should return a never-descriptor, if any parent has a never descriptor for the roles of this user"
  );
});
