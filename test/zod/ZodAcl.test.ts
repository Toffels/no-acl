import { z } from "zod";
import { za, ZAcl } from "../../src/zod/ZAcl";

describe("ZAcl", () => {
  const ztest = ZAcl(
    z.object({
      id: za("@read", z.string()),
    })
  );

  type itest = z.infer<typeof ztest>;

  const test: itest = {
    id: "asd",
  };

  it("should have an id", () => {
    expect(test.id).toBe("asd");
  });

  const myComplexSchema = ZAcl(
    z.object({
      string: za("@r", z.string().min(5).max(100).email()),
      number_int: za("@r", z.number().int().positive().lt(100)),
      boolean: za("@r", z.boolean().default(false)),
      nullish: za("@r", z.null().optional()),
      array: za(
        "@r",
        z.array(
          z.object({
            name: za("@r", z.string()),
            age: z.number().int(),
          })
        )
      ),
      object: za(
        "@r",
        z.object({
          nested: za("@r", z.string()).url(),
          anotherNumber: za("@r", z.number()).nonnegative(),
        })
      ),
      tuple: za("@r", z.tuple([z.string(), z.number(), z.boolean()])),
      union: za("@r", z.union([z.string(), z.number(), z.boolean()])),
      intersection: za(
        "@r",
        z.intersection(
          z.object({ shared: za("@r", z.string()) }),
          z.object({ unique: za("@r", z.number().optional()) })
        )
      ),
      enum: za("@r", z.enum(["Cat", "Dog", "Bird"])),
      literal: za("@r", z.literal(42)),
      date: za("@r", z.date().or(z.string().transform((str) => new Date(str)))),
      promise: za("@r", z.promise(z.string())),
      record: za("@r", z.record(z.number())),
      map: za("@r", z.map(z.string(), z.number())),
      set: za("@r", z.set(z.string())),
      function: za("@r", z.function(z.tuple([z.string()]), z.number())),
      // lazy: za(
      //   "@r",
      //   z.lazy(() => myComplexSchema )
      // ), // for recursive types
      refinement: za(
        "@r",
        z.string().refine((val) => val.startsWith("Hello"), {
          message: "String must start with 'Hello'",
        })
      ),
      preprocess: za(
        "@r",
        z.preprocess((input) => {
          if (typeof input === "string") {
            return input.trim();
          }
          return input;
        }, z.string())
      ),
      bigint: za("@r", z.bigint()),
      any: za("@r", z.any()),
      unknown: za("@r", z.unknown()),
      void: za("@r", z.void()),
      never: za("@r", z.never()),
      optional: za("@r", z.string().optional()),
      nullable: za("@r", z.string().nullable()),
      default: za("@r", z.string().default("Default value")),
      transform: za(
        "@r",
        z.number().transform((n) => n.toString())
      ),
      brand: za("@r", z.string().brand<"Brand">()),
      custom: za(
        "@r",
        z.string().refine((val) => val.includes("@"), {
          message: "String must include '@'",
        })
      ),
      // ... you can continue adding other complex structures as needed
    })
  );
});
