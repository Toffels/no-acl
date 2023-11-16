import { serializeRegex } from "./utils";
import { ArrayDescriptor, Descriptor } from "../Types";

export function serializeDescriptor(descriptor: Descriptor): Descriptor {
  if (typeof descriptor === "object") {
    if (Array.isArray(descriptor)) {
      // Array
      return descriptor.map(serializeDescriptor) as ArrayDescriptor;
      // Special
    } else {
      const copy = { ...descriptor };

      if (!Array.isArray(copy.roles))
        throw new Error(`Descriptor property roles must be an array type.`);

      const roles = copy.roles.map(serializeRegex);
      copy.roles = [roles.shift()!, ...roles];

      return copy;
    }
  }

  return descriptor;
}
