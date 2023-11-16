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
    }
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
    expect(applied.hasOwnProperty("example")).toBe(false);
    expect(applied.hasOwnProperty("dropped")).toBe(false);
    expect(applied.hasOwnProperty("dropped_deep")).toBe(false);
    expect(applied.hasOwnProperty("unset")).toBe(false);
    expect(!!applied.example?.hasOwnProperty("dropped")).toBe(false);
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
    }>({
      value: [
        { d: SimpleDescriptorEnum.write, roles: ["test"] },
        { d: SimpleDescriptorEnum.never, roles: ["test"] },
        { d: SimpleDescriptorEnum.read, roles: ["not-allowed-to"] },
      ],
    });

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
    { strict: false }
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
    expect(applied.example?.dropped).toBeUndefined();
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
      { strict: false }
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

  it("should make a copy of the input data", () => {
    const acl = ACL.FromJson({
      config: SDE.r,
    });

    const data = { config: "config" };
    expect(acl.read(data, { roles: [] })[0]).not.toBe(data);
    expect(acl.read(data, { roles: [] })[0] === data).toBe(false);
  });

  it("should clean up empty objects", () => {
    const acl = ACL.FromJson(
      {
        config: SDE.never,
      },
      { strict: false }
    );

    const data = {
      config: { b: { c: { d: "config" } } },
      config2: { b: { c: { d: {} } } },
    };
    const [applied, removals] = acl.read(data, { roles: [] });
    expect(applied).toStrictEqual({});
  });

  it("should clean up empty objects", () => {
    const acl = ACL.FromJson(
      {
        "config.b.c.d": SDE.never,
      },
      { strict: false }
    );

    const data = {
      config: { b: { c: { d: "config" } } },
      config2: { b: { c: { d: {} } } },
      config3: { b: { c: { d: 1 } } },
    };
    const [applied, removals] = acl.read(data, { roles: [] });
    expect(applied).toStrictEqual({
      config3: { b: { c: { d: 1 } } },
    });
  });

  it("should correctly apply write-only descriptors to specified fields", () => {
    const acl = ACL.FromJson({
      "config.b.c.d": SDE.write,
      "config.b": SDE.read,
      "config.c": SDE.write,
    });

    const [applied, removals] = acl.write(
      {
        config: {
          b: { c: { d: 1 } },
          c: 3,
        },
      },
      { roles: [] }
    );

    expect(applied).toStrictEqual({ config: { c: 3 } });
    expect(removals).toContain("config.b");
  });

  it("should properly handle array elements with specific role-based access", () => {
    const acl = ACL.FromJson({
      config: { d: SDE.rw, roles: ["any"] },
      "config.0.field": { d: SDE.rw, roles: ["test-0"] },
      "config.1.field": { d: SDE.rw, roles: ["test-1"] },
    });

    // False input will not be processed as expected, which is to be expected by the definition of the acl.
    {
      const [applied, removals] = acl.write(
        {
          config: {
            b: { c: { d: 1 } },
            c: 3,
          },
        },
        { roles: ["any", "test-1"] }
      );

      expect(applied).toStrictEqual({
        config: {
          b: { c: { d: 1 } },
          c: 3,
        },
      });
      expect(removals).toContain("config.0.field");
    }

    // With proper data, expected output will be produced
    {
      const [applied, removals] = acl.write(
        {
          config: [{ field: 0 }, { field: 1 }],
        },
        { roles: ["any", "test-1"] }
      );

      expect(applied).toStrictEqual({
        config: [, { field: 1 }],
      });
      expect(removals).toContain("config.0.field");
    }
  });

  it("should validate the behavior when no roles are assigned to a user", () => {
    const acl = ACL.FromJson({
      config: SDE.rw,
      "config.0.field": { d: SDE.rw, roles: ["test-0"] },
      "config.1.field": { d: SDE.rw, roles: ["test-1"] },
      "config.*.field": SDE.rw,
    });

    const [applied, removals] = acl.write(
      {
        config: [{ field: 0 }, { field: 1 }, { field: 2 }],
      },
      { roles: ["any", "test-1"] }
    );

    expect(applied).toStrictEqual({
      config: [, { field: 1 }, { field: 2 }],
    });
  });

  it("should ensure that fields with 'readWrite' descriptors are both readable and writable, and others are restricted", () => {
    // Define a user and data model
    const user = { roles: ["user"] };
    const data = {
      config: {
        setting1: "value1",
        setting2: "value2",
        restrictedSetting: "restricted",
      },
    };

    // Define an ACL with 'readWrite' descriptors and a restricted field
    const acl = ACL.FromJson({
      "config.setting1": SimpleDescriptorEnum.readWrite,
      "config.setting2": SimpleDescriptorEnum.readWrite,
      "config.restrictedSetting": SimpleDescriptorEnum.none, // restricted field
    });

    // Perform a read operation
    const [readResult, readRemovals] = acl.read(data, user);
    expect(readResult.config).toBeDefined();
    expect(readResult.config.setting1).toBe("value1");
    expect(readResult.config.setting2).toBe("value2");
    expect(readResult.config.restrictedSetting).toBeUndefined(); // Verify the restricted field is not present

    // Perform a write operation
    const newData = {
      config: {
        setting1: "new value1",
        setting2: "new value2",
        restrictedSetting: "new restricted",
      },
    };
    const [writeResult, writeRemovals] = acl.write(newData, user);
    expect(writeResult.config).toBeDefined();
    expect(writeResult.config.setting1).toBe("new value1");
    expect(writeResult.config.setting2).toBe("new value2");
    expect(writeResult.config.restrictedSetting).toBeUndefined(); // Verify the restricted field is not present after write
  });

  it("should test the removal of fields based on user roles in a complex object hierarchy", () => {
    const user = { roles: ["basicUser"] };
    const data = {
      section: {
        publicInfo: "Visible to all",
        privateInfo: "Visible to admins only",
        sensitiveInfo: "Visible to superadmins only",
      },
    };

    const acl = ACL.FromJson({
      "section.publicInfo": SimpleDescriptorEnum.read,
      "section.privateInfo": [
        { d: SimpleDescriptorEnum.read, roles: ["admin"] },
      ],
      "section.sensitiveInfo": [
        { d: SimpleDescriptorEnum.read, roles: ["superadmin"] },
      ],
    });

    const [result] = acl.read(data, user);
    expect(result.section).toBeDefined();
    expect(result.section.publicInfo).toBe("Visible to all");
    expect(result.section.privateInfo).toBeUndefined();
    expect(result.section.sensitiveInfo).toBeUndefined();
  });

  it("should verify the behavior when conflicting descriptors are applied to the same path", () => {
    const user = { roles: ["editor", "viewer"] };
    const data = { content: "Editable content" };

    const acl = ACL.FromJson({
      content: [
        { d: SimpleDescriptorEnum.read, roles: ["viewer"] },
        { d: SimpleDescriptorEnum.write, roles: ["editor"] },
      ],
    });

    const [readResult] = acl.read(data, user);
    expect(readResult.content).toBe("Editable content"); // Assuming read access is granted

    const [writeResult] = acl.write({ content: "New content" }, user);
    expect(writeResult.content).toBe("New content"); // Assuming write access is granted
  });

  /** This could be useful to show in a ui, by which role a field is visible or invisible and so on ... */
  it.todo("should be able to tell me how it resolved a field");
});
