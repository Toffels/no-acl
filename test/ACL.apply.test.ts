import { ACL } from "../src/ACL";
import { GenericUser, SimpleDescriptorEnum } from "../src/Types";

const user: GenericUser = { roles: [] };

describe("ACL.apply() strict", () => {
  const acl = ACL.FromJson(
    {
      example: SimpleDescriptorEnum.rw,
      "example.dropped": SimpleDescriptorEnum.none,
      dropped: SimpleDescriptorEnum.none,
      dropped_deep: SimpleDescriptorEnum.none,
      "dropped_deep.no_need_to_be_dropped": SimpleDescriptorEnum.rw,
    },
    true
  );

  beforeEach(() => {
    // Assure the logs are only spammed where needed.
    // Usually ever only when developing the test - any debug = true call should be removed before commit ;)
    acl.debug = false;
  });

  const data = {
    example: { dropped: "value" },
    dropped: "value",
    unset: "value",
    dropped_deep: { no_need_to_be_dropped: "value" },
  };

  it("remove everything", () => {
    const [applied, removals] = acl.read(data, user);

    expect(removals).toStrictEqual(
      [
        // removed, because it's set to none implicitly, since the acl doesn't know the key and it's by default strict.
        "unset",

        // none
        "dropped_deep",
        "example.dropped",
        "dropped",
      ].sort()
    );

    // It's expected to keep this field, since it's explicitly set to readWrite
    expect(removals).not.toContain("example");
  });

  it("should skip processing of deeper lying properties, when the parent object will already be removed.", () => {
    acl.debug = true;
    const [applied, removals] = acl.read(data, user);

    expect(removals).toContain("dropped_deep");
    // Shouldn't contain it, since, it's cropped out earlier, by parent removal.
    expect(removals).not.toContain("dropped_deep.no_need_to_be_dropped");
  });

  it.todo("should remove all children when a parent is removed");

  it.todo(
    "should stop searching for a truthy descriptor, if it hits never descriptor"
  );
});

describe("ACL.apply() not strict", () => {
  const acl = ACL.FromJson(
    {
      example: SimpleDescriptorEnum.rw,
      "example.dropped": SimpleDescriptorEnum.none,
      dropped: SimpleDescriptorEnum.none,
    },
    false
  );

  const data = {
    example: { dropped: "value" },
    dropped: "value",
    unset: "value",
  };

  it("remove everything", () => {
    const [applied, removals] = acl.read(data, user);

    expect(removals).toStrictEqual(
      [
        // removed, because it's set to none explicitly
        "example.dropped",
        // removed, because it's set to none explicitly
        "dropped",
      ].sort()
    );

    // It's expected to keep this field, since it's explicitly set to readWrite
    expect(removals).not.toContain("example");
    // Should be kept, because it's set to readWrite, because it's none-strict mode
    expect(removals).not.toContain("unset");
  });
});
