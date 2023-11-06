import * as z from "zod";

const asd = z.object({
  union: z.union([
    z.object({
      a: z.number(),
    }),
    z.object({
      b: z.number(),
    }),
  ]),
});

export type zasd = z.infer<typeof asd>;
