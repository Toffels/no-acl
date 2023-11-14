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
  type User = { roles: string[]; groups: string[] };

  const tenantSchema = ZAcl(
    z.object({
      id: za("@auth_read", z.string()),
      name: za(["@auth_edit", "@auth_read"], z.string()),
      paymentInfo: z.object({
        cardNumber: z.string(),
        expiryDate: z.string(),
        cvv: z.string().optional(),
        billingAddress: z.string(),
      }),
      subscriptionPlan: z.enum(["basic", "premium", "enterprise"]),
      gameEnginesAccess: z.array(z.string()), // List of game engines available to the tenant
      supportTier: z.enum(["standard", "priority", "vip"]),
      metaData: z.record(z.string(), z.any()),
      projectIds: z.array(z.string()),
      creationDate: z.date(),
      lastModifiedDate: z.date(),
      status: z.enum(["active", "inactive", "suspended"]),
    }),
    {
      getRoles: (user: User) => [
        ...user.roles,
        ...(user.groups ?? []).map((grp) => `tenant_${grp}`),
      ],
      vars: {
        "@auth_read": [
          { d: SDE.read, roles: ["regex#^tenant_.*$#"] },
          { d: SDE.read, roles: ["support"] },
          { d: SDE.read, roles: ["admin"] },
        ],
        "@auth_edit": [
          { d: SDE.write, roles: ["regex#^tenant_.*$#"] },
          { d: SDE.write, roles: ["admin"] },
        ],
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
  it("should have a regex in the roles for variable auth_read", () => {
    expect(
      (
        (
          tenantSchemaJson["@auth_read"] as ArrayDescriptor
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

    expect(getDescriptor("name")).toStrictEqual(["@auth_edit", "@auth_read"]);
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
});
