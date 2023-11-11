import { serializeRegex } from "./utils";
import { ArrayDescriptor, Descriptor } from "./Types";

export function serializeDescriptor(descriptor: Descriptor): Descriptor {
  if (typeof descriptor === "object") {
    if (Array.isArray(descriptor)) {
      // Array
      return descriptor.map(serializeDescriptor) as ArrayDescriptor;
      // Special
    } else {
      const copy = { ...descriptor };
      if (copy.roles instanceof RegExp) copy.roles = serializeRegex(copy.roles);
      else if (Array.isArray(copy.roles)) {
        const roles = copy.roles.map(serializeRegex);
        copy.roles = [roles.shift()!, ...roles];
      }

      return copy;
    }
  }

  return descriptor;
}
