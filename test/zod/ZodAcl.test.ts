import { z } from "zod";
import { zInit, a, A } from "../../src/zod/AssignAcl";

zInit(z);

describe("ZAcl", () => {
  const ztest = A(
    z.object({
      id: a("@read", z.string()),
    })
  );

  type itest = z.infer<typeof ztest>;

  const test: itest = {
    id: "asd",
  };

  it("should have an id", () => {
    expect(test.id).toBe("asd");
  });

  const myComplexSchema = A(
    z.object({
      string: a("@r", z.string()),
      email: a("@r", z.string().min(5).max(100).email()),
      number_int: a("@r", z.number().int().positive().lt(100)),
      boolean: a("@r", z.boolean().default(false)),
      nullish: a("@r", z.null().optional()),
      array: a(
        "@r",
        z.array(
          z.object({
            name: a("@r", z.string()),
            age: z.number().int(),
          })
        )
      ),
      object: a(
        "@r",
        z.object({
          nested: a("@r", z.string().url()),
          anotherNumber: a("@r", z.number().nonnegative()),
        })
      ),
      tuple: a("@r", z.tuple([z.string(), z.number(), z.boolean()])),
      union: a("@r", z.union([a("@rw", z.string()), z.number(), z.boolean()])),
      intersection: a(
        "@r",
        z.intersection(
          a("@r", z.object({ shared: a("@r", z.string()) })),
          a(
            "@r",
            z.object({
              shared: a("@r", z.string()),
              unique: a("@r", z.number().optional()),
            })
          )
        )
      ),
      enum: a("@r", z.enum(["Cat", "Dog", "Bird"])),
      literal: a("@r", z.literal(42)),
      date: a("@r", z.date().or(z.string().transform((str) => new Date(str)))),
      promise: a("@r", z.promise(z.string())),
      record: a(
        "@r",
        z.record(
          z.object({
            number: a("@r", z.number()),
            obj: a(
              "@r",
              z.object({
                str: a("@r", z.string()),
              })
            ),
            rec: a("@r", z.record(z.string())),
          })
        )
      ),

      map: a("@r", z.map(z.string(), z.number())),
      set: a("@r", z.set(z.string())),
      function: a("@r", z.function(z.tuple([z.string()]), z.number())),

      refinement: a(
        "@r",
        z.string().refine((val) => val.startsWith("Hello"), {
          message: "String must start with 'Hello'",
        })
      ),
      preprocess: a(
        "@r",
        z.preprocess((input) => {
          if (typeof input === "string") {
            return input.trim();
          }
          return input;
        }, z.string())
      ),
      bigint: a("@r", z.bigint()),
      any: a("@r", z.any()),
      unknown: a("@r", z.unknown()),
      void: a("@r", z.void()),
      never: a("@r", z.never()),
      optional: a("@r", z.string().optional()),
      nullable: a("@r", z.string().nullable()),
      default: a("@r", z.string().default("Default value")),
      transform: a(
        "@r",
        z.number().transform((n) => n.toString())
      ),
      brand: a("@r", z.string().brand<"Brand">()),
      custom: a(
        "@r",
        z.string().refine((val) => val.includes("@"), {
          message: "String must include '@'",
        })
      ),
      // ... you can continue adding other complex structures as needed
    })
  );

  it("should fetch the acl from the zod definition", () => {
    expect(myComplexSchema.noacl.original).toStrictEqual({
      string: "@r",
      email: "@r",
      number_int: "@r",
      boolean: "@r",
      nullish: "@r",
      array: "@r",
      "array.*": "@r",
      "array.*.name": "@r",
      object: "@r",
      "object.nested": "@r",
      "object.anotherNumber": "@r",
      tuple: "@r",
      union: "@r",
      intersection: "@r",
      "intersection.shared": "@r",
      "intersection.unique": "@r",
      enum: "@r",
      literal: "@r",
      date: "@r",
      promise: "@r",
      record: "@r",
      "record.*": "@r",
      "record.*.number": "@r",
      "record.*.obj": "@r",
      "record.*.obj.str": "@r",
      "record.*.rec": "@r",
      "record.*.rec.*": "@r",
      map: "@r",
      set: "@r",
      function: "@r",
      refinement: "@r",
      preprocess: "@r",
      bigint: "@r",
      any: "@r",
      unknown: "@r",
      void: "@r",
      never: "@r",
      optional: "@r",
      nullable: "@r",
      default: "@r",
      transform: "@r",
      brand: "@r",
      custom: "@r",
    });
  });
});
