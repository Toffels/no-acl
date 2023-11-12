import type { AnyZodObject } from "zod";
import { ThrowNotImplemented } from "./errors/NotImplemented";

export function FromZod(zod: AnyZodObject) {
  ThrowNotImplemented("FromZod");
  return {};
}
