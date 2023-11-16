import { ZodObject, z } from "zod";
import { ACL } from "../../src/ACL";
import {
  ArrayDescriptor,
  Descriptor,
  GenericUser,
  SDE,
  SimpleDescriptorEnum,
  SpecialDescriptor,
} from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";
import { ZAcl, za } from "../../src/zod/ZAcl";

describe("ACL.apply() from Zod with realistic data.", () => {
  type User = { roles: string[]; groups?: string[] };

  const getRoles = (user: User) => [
    ...user.roles,
    ...(user.groups ?? []).map((grp) => `tenant_${grp}`),
  ];
  const tenantRegex = "regex#^tenant_.*$#" as const;
  const vars = {
    "@userread": { d: SDE.read, roles: [tenantRegex] },
    "@userwrite": { d: SDE.write, roles: [tenantRegex] },
    "@userreadwrite": { d: SDE.readWrite, roles: [tenantRegex] },
    // authorized read
    "@aread": [
      { d: SDE.read, roles: [tenantRegex] },
      { d: SDE.read, roles: ["admin", "support"] },
    ],
    // authorized write
    "@awrite": [
      { d: SDE.write, roles: [tenantRegex] },
      { d: SDE.write, roles: ["admin"] },
    ],
    // authorized read & authorized write
    "@arw": ["@aread", "@awrite"],
    // Admin NEVER
    "@adminnever": { d: SDE.never, roles: ["admin", "support"] },
  } as Record<`@${string}`, Descriptor>;

  const tenantSchema = ZAcl(
    z.object({
      // In a real model it probably would be @aread
      id: za("@read", z.string()),
      name: za("@arw", z.string()),
      paymentInfo: za(
        ["@aread", "@userwrite"],
        z.object({
          cardNumber: za("@adminnever", z.string()),
          expiryDate: za("@adminnever", z.string()),
          cvv: za("@adminnever", z.string().optional()),
          billingAddress: z.string(),
        })
      ),
      subscriptionPlan: za("@arw", z.enum(["basic", "premium", "enterprise"])),
      gameEnginesAccess: za("@arw", z.array(z.string())), // List of game engines available to the tenant
      supportTier: za("@arw", z.enum(["standard", "priority", "vip"])),
      metaData: za("@arw", z.record(z.string(), z.any())),
      projectIds: za("@arw", z.array(z.string())),
      creationDate: za("@arw", z.date()),
      lastModifiedDate: za("@arw", z.date()),
      status: za("@arw", z.enum(["active", "inactive", "suspended"])),
    }),
    {
      vars,
      getRoles,
    }
  );

  const projectSchema = z
    .object({
      id: za("@read", z.string()),
      name: z.string().za("@read"),
      tenantId: z.string(),
      gameGenre: z.enum([
        "action",
        "strategy",
        "puzzle",
        "adventure",
        "simulation",
        "other",
      ]),
      platforms: z.array(z.enum(["PC", "Console", "Mobile", "VR"])),
      settings: z.object({
        reportUsageTo: z.string(),
        additionalConfig: z.boolean(),
        versionControlSystem: z.string().optional(), // e.g., Git, SVN
        collaborationTools: z.array(z.string()).optional(), // e.g., Slack, Trello
      }),
      timeInformation: z.object({
        usedTimeThisMonth: z.number(),
        totalDevelopmentTime: z.number().optional(),
      }),
      serverConfiguration: z.object({
        useSpecificConfiguration: z.boolean(),
        configurationDetails: z.string().optional(),
      }),
      currentVersion: z.string(),
      creationDate: z.date(),
      lastModifiedDate: z.date(),
      status: z.enum(["active", "inactive", "pending", "released"]),
    })
    .zacl({
      vars,
      getRoles,
    });

  it("should have the acl property", () => {
    expect(projectSchema.acl).toBeInstanceOf(ACL);
  });

  it("should have the descriptor property", () => {
    expect(projectSchema.shape.name.descriptor).toBe("@read");
  });

  const tenantSchemaAclJson = tenantSchema.acl.toJson();
  it("should have a regex in the roles for variable aread", () => {
    expect(
      (
        (
          tenantSchemaAclJson["@aread"] as ArrayDescriptor
        )[0] as SpecialDescriptor
      )["roles"][0]
    ).toBe("regex#^tenant_.*$#");
  });

  it("should resolve array descriptor deeply", () => {
    const getDescriptor = tenantSchema.acl["getDescriptor"].bind(
      tenantSchema.acl
    );
    const evalDescriptor = tenantSchema.acl["evalDescriptor"].bind(
      tenantSchema.acl
    );

    expect(getDescriptor("name")).toStrictEqual(["@aread", "@awrite"]);
    expect(
      evalDescriptor(getDescriptor("name"), { roles: [] }, SDE.read)
    ).toStrictEqual([SDE.none]);
    expect(
      evalDescriptor(getDescriptor("name"), { roles: ["admin"] }, SDE.read)
    ).toStrictEqual([SDE.read, ["admin"]]);
    expect(
      evalDescriptor(getDescriptor("name"), { roles: ["tenant_a"] }, SDE.read)
    ).toStrictEqual([SDE.read, ["tenant_a"]]);
  });

  it("should care about not showing the creditcard information to admins", () => {
    const data = <z.infer<typeof tenantSchema>>{};
    const [applied, removed, roles, paths] = tenantSchema.acl.apply(
      data,
      {
        roles: ["admin"],
        groups: ["Google"],
      },
      SDE.write,
      true
    );

    expect(roles["id"]).toStrictEqual(undefined);
    // It resolves with the first role found.
    // The first role here comes from the @arw > @aread > tenant-regex
    expect(roles["name"]).toStrictEqual(["tenant_Google"]);

    expect(removed).toContain("paymentInfo.cardNumber");
    expect(roles["paymentInfo.cardNumber"]).toStrictEqual(["admin"]);
    expect(removed).toContain("paymentInfo.expiryDate");
    expect(roles["paymentInfo.expiryDate"]).toStrictEqual(["admin"]);
    expect(removed).toContain("paymentInfo.cvv");
    expect(roles["paymentInfo.cvv"]).toStrictEqual(["admin"]);
  });

  console.log(tenantSchema.acl.toString(true));
});
