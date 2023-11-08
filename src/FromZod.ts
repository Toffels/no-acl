import { z } from "zod";
import { ThrowNotImplemented } from "./errors/NotImplemented";

export function FromZod(zod: z.AnyZodObject) {
  ThrowNotImplemented("FromZod");
  return {};
}
