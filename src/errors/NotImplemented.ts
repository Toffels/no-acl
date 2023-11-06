import { AclError } from "./AclError";

export class NotImplemented extends AclError {}

export function ThrowNotImplemented(text: string) {
  throw new NotImplemented(`${text} not implemented.`);
}
