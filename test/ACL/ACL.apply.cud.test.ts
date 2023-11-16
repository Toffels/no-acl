import { ACL } from "../../src/ACL";
import { GenericUser, SDE, SimpleDescriptorEnum } from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";

describe("ACL with new descriptor types (create, update, delete)", () => {
  let user: GenericUser;
  let data: {
    resource: {
      id: string;
      content: any;
      newContent: any;
      updatedContent: any;
      deletedContent: any;
    };
  };
  let acl: ACL<typeof data>;

  beforeEach(() => {
    // Setup ACL with different descriptors including the new ones
    acl = ACL.FromJson<typeof data>({
      resource: SimpleDescriptorEnum.readWrite,
      "resource.id": SimpleDescriptorEnum.read,
      "resource.newContent": SimpleDescriptorEnum.create,
      "resource.updatedContent": SimpleDescriptorEnum.update,
      "resource.deletedContent": SimpleDescriptorEnum.delete,
      "resource.content": SimpleDescriptorEnum.readWrite,
    });

    // Define a user
    user = { roles: ["user"] };

    // Define a data model
    data = {
      resource: {
        id: "id",
        content: "Initial Content",
        newContent: null,
        updatedContent: null,
        deletedContent: "To be deleted",
      },
    };
  });

  it("should allow creating resources with 'create' descriptor", () => {
    const newData = {
      ...data,
      resource: { ...data.resource, newContent: "New Content" },
    };
    const [result, removals] = acl.apply(newData, user, SDE.create, true);
    expect(result.resource?.newContent).toBe("New Content");
  });

  it("should allow updating resources with 'update' descriptor", () => {
    const newData = {
      ...data,
      resource: { ...data.resource, updatedContent: "Updated Content" },
    };
    const [result, removals] = acl.apply(newData, user, SDE.update, true);
    expect(result.resource?.updatedContent).toBe("Updated Content");
  });

  it("should allow deleting resources with 'delete' descriptor", () => {
    const newData = {
      ...data,
      resource: { ...data.resource, deletedContent: null },
    };
    const [result, removals] = acl.apply(newData, user, SDE.delete, true);
    expect(result.resource?.deletedContent).toBeNull();
  });

  it("should not interfere with existing 'read' and 'write' descriptors", () => {
    // Test read
    const [readResult] = acl.apply(data, user, SDE.read, true);
    expect(readResult.resource?.id).toBe("id");

    // Test write
    const newData = {
      ...data,
      resource: { ...data.resource, content: "Updated by Write" },
    };
    const [writeResult] = acl.apply(newData, user, SDE.write, true);
    expect(writeResult.resource?.content).toBe("Updated by Write");
  });
});
