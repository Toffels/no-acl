import { z } from "zod";
import { ACL } from "../../src/ACL";
import {
  ArrayDescriptor,
  GenericUser,
  SDE,
  SimpleDescriptorEnum,
  SpecialDescriptor,
} from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";
import { ZAcl, za } from "../../src/zod/ZAcl";

describe("ACL.apply() from Zod with realistic data.", () => {
  type User = { roles: string[]; groups?: string[] };

  const tenantSchema = ZAcl(
    z.object({
      id: za("@aread", z.string()),
      name: za(["@awrite", "@aread"], z.string()),
      paymentInfo: za(
        ["@aread", "@userwrite"],
        z.object({
          cardNumber: za("@adminnever", z.string()),
          expiryDate: za("@adminnever", z.string()),
          cvv: za("@adminnever", z.string().optional()),
          billingAddress: z.string(),
        })
      ),
      subscriptionPlan: za(
        SDE.readWrite,
        z.enum(["basic", "premium", "enterprise"])
      ),
      gameEnginesAccess: za(SDE.readWrite, z.array(z.string())), // List of game engines available to the tenant
      supportTier: za(SDE.readWrite, z.enum(["standard", "priority", "vip"])),
      metaData: za(SDE.readWrite, z.record(z.string(), z.any())),
      projectIds: za(SDE.readWrite, z.array(z.string())),
      creationDate: za(SDE.readWrite, z.date()),
      lastModifiedDate: za(SDE.readWrite, z.date()),
      status: za(SDE.readWrite, z.enum(["active", "inactive", "suspended"])),
    }),
    {
      getRoles: (user: User) => [
        ...user.roles,
        ...(user.groups ?? []).map((grp) => `tenant_${grp}`),
      ],
      vars: {
        "@userread": { d: SDE.read, roles: ["regex#^tenant_.*$#"] },
        "@userwrite": { d: SDE.write, roles: ["regex#^tenant_.*$#"] },
        "@userreadwrite": { d: SDE.readWrite, roles: ["regex#^tenant_.*$#"] },
        // authorized
        "@aread": [
          { d: SDE.read, roles: ["regex#^tenant_.*$#"] },
          { d: SDE.read, roles: ["admin", "support"] },
        ],
        // authorized
        "@awrite": [
          { d: SDE.write, roles: ["regex#^tenant_.*$#"] },
          { d: SDE.write, roles: ["admin"] },
        ],
        "@adminnever": { d: SDE.never, roles: ["admin", "support"] },
      },
    }
  );

  const projectSchema = ZAcl(
    z.object({
      id: z.string(),
      name: z.string(),
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
  );

  const tenantSchemaJson = tenantSchema.acl.toJson();
  it("should have a regex in the roles for variable aread", () => {
    expect(
      ((tenantSchemaJson["@aread"] as ArrayDescriptor)[0] as SpecialDescriptor)[
        "roles"
      ][0]
    ).toBe("regex#^tenant_.*$#");
  });

  it("should resolve array descriptor deeply", () => {
    const getDescriptor = tenantSchema.acl["getDescriptor"].bind(
      tenantSchema.acl
    );
    const evalDescriptor = tenantSchema.acl["evalDescriptor"].bind(
      tenantSchema.acl
    );

    expect(getDescriptor("name")).toStrictEqual(["@awrite", "@aread"]);
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
    const [applied, removed] = tenantSchema.acl.read(data, {
      roles: ["admin"],
      groups: ["tenant_a"],
    });

    expect(removed).toContain("paymentInfo.cardNumber");
    expect(removed).toContain("paymentInfo.expiryDate");
    expect(removed).toContain("paymentInfo.cvv");
  });
});
