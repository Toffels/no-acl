import { serializeRegex } from "./utils";
import { ArrayDescriptor, Descriptor } from "./Types";

export function serializeDescriptor(descriptor: Descriptor): Descriptor {
  if (typeof descriptor === "object") {
    if (Array.isArray(descriptor)) {
      // Array
      return descriptor.map(serializeDescriptor) as ArrayDescriptor;
      // Special
    } else {
      if (descriptor.roles instanceof RegExp)
        descriptor.roles = serializeRegex(descriptor.roles);
      else if (Array.isArray(descriptor.roles)) {
        const roles = descriptor.roles.map(serializeRegex);
        descriptor.roles = [roles.shift()!, ...roles];
      }
    }
  }

  return descriptor;
}
