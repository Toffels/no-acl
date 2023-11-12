import { ACL } from "../../src/ACL";
import { GenericUser, SDE, SimpleDescriptorEnum } from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";

const user: GenericUser = { roles: [] };

describe("ACL.apply() strict", () => {
  const acl = ACL.FromJson<{ example: { dropped: string }; dropped_deep: any }>(
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
    expect(applied.hasOwnProperty("example")).toBe(true);
    expect(applied.hasOwnProperty("dropped")).toBe(false);
    expect(applied.hasOwnProperty("dropped_deep")).toBe(false);
    expect(applied.hasOwnProperty("unset")).toBe(false);
    expect(applied.example!.hasOwnProperty("dropped")).toBe(false);

    // It's expected to keep this field, since it's explicitly set to readWrite
    expect(removals).not.toContain("example");
  });

  it("should skip processing of deeper lying properties, when the parent object will already be removed.", () => {
    // acl.debug = true;
    const [applied, removals] = acl.read(data, user);

    expect(removals).toContain("dropped_deep");
    // Shouldn't contain it, since, it's cropped out earlier, by parent removal.
    expect(removals).not.toContain("dropped_deep.no_need_to_be_dropped");
    expect(
      applied.dropped_deep?.hasOwnProperty("no_need_to_be_dropped")
    ).toBeFalsy();
  });

  it("should remove all children when a parent is removed", () => {
    const acl = ACL.FromJson<{
      obj: { a: number; b: number; c: number };
    }>({
      obj: SimpleDescriptorEnum.none,
    });

    const [applied, removals] = acl.read({ obj: { a: 1, b: 2, c: 3 } }, user);

    expect(removals).toContain("obj");
    expect(applied?.obj?.a).toBe(undefined);
    expect(applied?.obj).toBe(undefined);
  });

  /** Any never will overwrite any other descriptor
   * This way you can specify something like this:
   * 
   * ```
   * user = { roles: ["test", "not-allowed-to"] }
   * [
      { d: SimpleDescriptorEnum.write, roles: ["test"] },
      { d: SimpleDescriptorEnum.read, roles: ["test"] },
      { d: SimpleDescriptorEnum.never, roles: ["not-allowed-to"] },
     ]
      ```
   */
  it("should stop searching for a truthy descriptor, if it hits never descriptor", () => {
    const user = { roles: ["test", "not-allowed-to"] };
    const acl = ACL.FromJson<{
      value: string;
    }>(
      {
        value: [
          { d: SimpleDescriptorEnum.write, roles: ["test"] },
          { d: SimpleDescriptorEnum.never, roles: ["test"] },
          { d: SimpleDescriptorEnum.read, roles: ["not-allowed-to"] },
        ],
      },
      true
    );

    {
      const [applied, removals] = acl.read({ value: "value" }, user);

      expect(removals).toContain("value");
      expect(applied.hasOwnProperty("value")).toBe(false);
    }

    {
      const [applied, removals] = acl.write({ value: "value" }, user);

      expect(removals).toContain("value");
      expect(applied.hasOwnProperty("value")).toBe(false);
    }
  });
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

describe("ACL.apply() additional tests", () => {
  it("should correctly apply descriptors to paths with wildcards", () => {
    const acl = ACL.FromJson<{ example: { dropped: any } }>({
      "example.*": SimpleDescriptorEnum.read,
      "example.dropped.*": SimpleDescriptorEnum.none,
    });

    const data = {
      example: { allowed: "value", dropped: { sensitive: "secret" } },
    };

    const [applied, removals] = acl.read(data, user);
    expect(applied.example?.hasOwnProperty("allowed")).toBe(true);
    expect(applied.example?.dropped).toStrictEqual({});
    expect(removals).toContain("example.dropped.sensitive");
  });

  it("should correctly handle multiple roles with different descriptors", () => {
    const user = { roles: ["admin", "user"] };
    const acl = ACL.FromJson({
      sensitive: [
        { d: SimpleDescriptorEnum.never, roles: ["user"] },
        { d: SimpleDescriptorEnum.readWrite, roles: ["admin"] },
      ],
    });

    const data = { sensitive: "data" };

    const [applied, removals] = acl.read(data, user);
    expect(applied.hasOwnProperty("sensitive"))
      // The reason for this is, that a never will be prioritized
      .toBe(false);
    expect(removals).toContain("sensitive");
  });

  it("should correctly handle multiple roles with different descriptors 2", () => {
    const user = { roles: ["admin", "user"] };
    const acl = ACL.FromJson({
      sensitive: [
        { d: SimpleDescriptorEnum.none, roles: ["user"] },
        { d: SimpleDescriptorEnum.readWrite, roles: ["admin"] },
      ],
    });

    const data = { sensitive: "data" };

    const [applied, removals] = acl.read(data, user);
    expect(applied.hasOwnProperty("sensitive")).toBe(
      user.roles.includes("admin")
    );
    expect(removals).not.toContain("sensitive");
  });

  it("should allow read but disallow write for a specific role", () => {
    const user = { roles: ["readOnlyUser"] };
    const acl = ACL.FromJson({
      config: [{ d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] }],
    });

    const data = { config: "configuration data" };

    const [appliedRead, removalsRead] = acl.read(data, user);
    expect(appliedRead.hasOwnProperty("config")).toBe(true);

    const [appliedWrite, removalsWrite] = acl.write(data, user);
    expect(appliedWrite.hasOwnProperty("config")).toBe(false);
  });

  it("should not remove unknown fields in non-strict mode", () => {
    const data = { unknownField: "value" };
    const acl = ACL.FromJson(
      {
        config: [{ d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] }],
      },
      false
    );

    const [applied, removals] = acl.read(data, user);
    expect(applied.hasOwnProperty("unknownField")).toBe(true);
    expect(removals).not.toContain("unknownField");
  });

  it("should correctly apply descriptors to array elements", () => {
    const user = { roles: ["readOnlyUser"] };
    const acl = ACL.FromJson({
      config: [{ d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] }],
      "config.0.canWrite": [
        { d: SimpleDescriptorEnum.never, roles: ["readOnlyUser"] },
      ],
    });

    const data = { config: [{ canWrite: 1, canRead: 1 }] };
    const [applied, removals] = acl.read(data, user);
    expect(removals).toContain("config.0.canWrite");
    expect(applied).toStrictEqual({ config: [{ canRead: 1 }] });
  });

  it("should correctly apply descriptors to array elements if wildcard was used", () => {
    const user = { roles: ["readOnlyUser"] };
    const acl = ACL.FromJson<{
      config: { canRead: number; canWrite: number }[];
    }>({
      config: [{ d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] }],
      "config.*.canWrite": [
        { d: SimpleDescriptorEnum.never, roles: ["readOnlyUser"] },
      ],
    });

    const data = { config: [{ canWrite: 1, canRead: 1 }] };
    const [applied, removals] = acl.read(data, user);
    expect(removals).toContain("config.0.canWrite");
    expect(applied.config?.[0]?.canRead).toBe(1);
    expect(applied.config?.[0]?.canWrite).toBeUndefined();
    expect(applied).toStrictEqual({ config: [{ canRead: 1 }] });
  });

  it("should resolve conflicts between multiple descriptors for the same path", () => {
    const user = { roles: ["canWrite", "readOnlyUser"] };
    const acl = ACL.FromJson<{
      config: { canRead: number; canWrite: number };
    }>({
      config: [
        { d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] },
        { d: SimpleDescriptorEnum.write, roles: ["canWrite"] },
      ],
      "config.*": [{ d: SimpleDescriptorEnum.none, roles: ["readOnlyUser"] }],
      "config.canRead": [
        { d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] },
      ],
      "config.canWrite": [
        { d: SimpleDescriptorEnum.write, roles: ["canWrite"] },
      ],
    });

    {
      const data = { config: { canWrite: 1, canRead: 1 } };
      const [applied, removals] = acl.read(data, user);
      // Requesting read, the write key should be removed.
      expect(removals).toStrictEqual(["config.canWrite"]);
      expect(applied.config?.hasOwnProperty("canRead")).toBe(true);
      expect(applied.config?.hasOwnProperty("canWrite")).toBe(false);
    }

    {
      const data = { config: { canWrite: 1, canRead: 1 } };
      const [applied, removals] = acl.write(data, user);
      // Requesting read, the write key should be removed.
      expect(removals).toStrictEqual(["config.canRead"]);
      expect(applied.config?.hasOwnProperty("canRead")).toBe(false);
      expect(applied.config?.hasOwnProperty("canWrite")).toBe(true);
    }
  });

  it("should handle nested wildcards in ACL paths correctly", () => {
    const user = { roles: ["readOnlyUser"] };
    type T = {
      config: {
        deep: { deeper: { propertyA: 1; propertyB: 1; propertyC: 1 } };
      };
    };
    const acl = ACL.FromJson<T>({
      config: { d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] },
      "config.*.*.propertyA": {
        d: SimpleDescriptorEnum.none,
        roles: ["readOnlyUser"],
      },
      "config.*.*.propertyB": {
        d: SimpleDescriptorEnum.read,
        roles: ["readOnlyUser"],
      },
      "config.deep.deeper.*": {
        d: SimpleDescriptorEnum.write,
        roles: ["readOnlyUser"],
      },
    });

    const data: T = {
      config: {
        deep: { deeper: { propertyA: 1, propertyB: 1, propertyC: 1 } },
      },
    };
    const [applied, removals] = acl.read(data, user);
    expect(removals).toStrictEqual([
      "config.deep.deeper.propertyA",
      "config.deep.deeper.propertyC",
    ]);
    expect(applied).toStrictEqual({
      config: {
        deep: {
          deeper: {
            propertyB: 1,
          },
        },
      },
    });
  });

  it("should evaluate the implicit inheritance", () => {
    const user = { roles: ["readOnlyUser"] };
    type T = {
      config: {
        deep: { deeper: { propertyA: 1; propertyB: 1; propertyC: 1 } };
      };
    };
    const acl = ACL.FromJson<T>({
      config: { d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] },
    });

    const data: T = {
      config: {
        deep: { deeper: { propertyA: 1, propertyB: 1, propertyC: 1 } },
      },
    };
    const [applied, removals] = acl.read(data, user);
    expect(removals).toStrictEqual([]);
    expect(applied).toStrictEqual(data);
  });

  it("should effectively handle overlapping roles with different access levels", () => {
    const user = {
      roles: ["readOnlyUser", "writeOnlyUser", "readWriteUser", "neverUser"],
    };
    type T = {
      config: "config";
      config2: "config2";
    };
    const acl = ACL.FromJson<T>({
      config: [
        { d: SimpleDescriptorEnum.read, roles: ["readOnlyUser"] },
        { d: SimpleDescriptorEnum.write, roles: ["writeOnlyUser"] },
        { d: SimpleDescriptorEnum.readWrite, roles: ["readWriteUser"] },
      ],
      config2: [
        { d: SimpleDescriptorEnum.never, roles: ["neverUser"] },
        { d: SimpleDescriptorEnum.write, roles: ["writeOnlyUser"] },
        { d: SimpleDescriptorEnum.readWrite, roles: ["readWriteUser"] },
      ],
    });

    {
      const data: T = {
        config: "config",
        config2: "config2",
      };
      const copy = { ...data };
      const [applied, removals] = acl.read(data, user);
      expect(removals).toStrictEqual(["config2"]);
      expect(applied).not.toStrictEqual(copy);
      expect(applied).toStrictEqual({ config: "config" });
    }

    {
      const data: T = {
        config: "config",
        config2: "config2",
      };
      const copy = { ...data };
      const [applied, removals] = acl.write(data, user);
      expect(removals).toStrictEqual(["config2"]);
      expect(applied).not.toStrictEqual(copy);
      expect(applied).toStrictEqual({ config: "config" });
    }
  });

  it("should handle nested wildcards in ACL paths correctly", () => {
    const acl = ACL.FromJson({
      "config.*.settings.*.properties.*.cookie": SDE.r,
    });

    const data = {
      config: {
        any: { settings: { any: { properties: { any: { cookie: 3 } } } } },
        anyOther: {
          settings2: { any: { properties: { any: { cookie: 3 } } } },
        },
      },
    };

    const [applied, removals] = acl.read(data, user);

    expect(removals).toContain(
      "config.anyOther.settings2.any.properties.any.cookie"
    );
    // This path should not exist.
    expect(
      getValueByPath(
        applied,
        "config.anyOther.settings2.any.properties.any.cookie"
      )
    ).toBeUndefined();
    expect(
      getValueByPath(applied, "config.any.settings.any.properties.any.cookie")
    ).toBe(3);
  });

  // it("should correctly apply write-only descriptors to specified fields", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // Fields with write-only descriptors should be writable but not readable.
  //   // Attempting to read these fields should result in them being excluded or undefined in the output.
  //   expect(/* condition for write-only fields being unwritable */).toBeTruthy();
  //   expect(/* condition for write-only fields being unreadable */).toBeFalsy();
  // });

  // it("should effectively handle overlapping roles with different access levels", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // Users with multiple roles should get an access level that correctly reflects all their roles.
  //   // In case of conflicting access levels, the most permissive or specific one should take precedence, as per your ACL logic.
  //   expect(/* condition for overlapping roles being handled effectively */).toBeTruthy();
  // });

  // it("should preserve the integrity of nested objects after applying descriptors", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // Nested objects should retain their structure and other properties not affected by ACL.
  //   // Only the fields specified by the descriptors should be altered or removed.
  //   expect(/* condition for integrity of nested objects */).toBeTruthy();
  // });

  // it("should properly handle array elements with specific role-based access", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // Array elements should be individually processed based on ACL rules.
  //   // Users with specific roles should have the appropriate access to each element as defined by ACL.
  //   expect(/* condition for proper handling of array elements */).toBeTruthy();
  // });

  // it("should validate the behavior when no roles are assigned to a user", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // Users without any roles should have access defined by default or 'none' roles in ACL.
  //   // The behavior should be consistent and predictable for users without roles.
  //   expect(/* condition for behavior with no assigned roles */).toBeTruthy();
  // });

  // it("should ensure that fields with 'readWrite' descriptors are both readable and writable", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // Fields with 'readWrite' descriptors should be accessible for both reading and writing operations.
  //   // No restrictions should be applied to these fields for users with appropriate roles.
  //   expect(/* condition for readWrite fields being accessible */).toBeTruthy();
  // });

  // it("should test the removal of fields based on user roles in a complex object hierarchy", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // The ACL should correctly remove fields at various nesting levels based on user roles.
  //   // The final object should only contain fields that the user's roles allow them to access.
  //   expect(/* condition for correct field removal based on roles */).toBeTruthy();
  // });

  // it("should verify the behavior when conflicting descriptors are applied to the same path", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // The ACL should have a defined way of resolving conflicts when multiple descriptors apply to the same path.
  //   // The test should verify that the conflict resolution mechanism works as intended.
  //   expect(/* condition for resolving conflicts between descriptors */).toBeTruthy();
  // });

  // it("should assess the performance of ACL.apply() on large and deeply nested objects", () => {
  //   // Implement test logic here
  //   // Expectations:
  //   // The ACL should handle large and deeply nested objects within reasonable time and resource constraints.
  //   // The test should check for any performance bottlenecks or issues when processing complex objects.
  //   expect(/* condition for performance assessment */).toBeTruthy();
  // });
});
