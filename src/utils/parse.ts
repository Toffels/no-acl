import { parseRegexOrString } from "./utils";
import {
  ArrayDescriptor,
  Descriptor,
  SimpleDescriptorEnum,
  SpecialDescriptor,
  VariableDescriptorKey,
} from "../Types";

export function assureDescriptor(descriptor: Descriptor): Descriptor {
  if (Array.isArray(descriptor)) {
    if (descriptor.length === 0)
      throw new Error(`Invalid descriptor: '${descriptor}'.`);
    return descriptor.map(assureDescriptor) as ArrayDescriptor;
  }

  const type = typeof descriptor;
  if (type === "string") {
    const des = descriptor as VariableDescriptorKey | SimpleDescriptorEnum;
    // VariableDescriptor
    if (des[0] === "@") return descriptor;
    if (
      !new Set([
        SimpleDescriptorEnum.n,
        SimpleDescriptorEnum.never,
        SimpleDescriptorEnum.readWrite,
        SimpleDescriptorEnum.read,
        SimpleDescriptorEnum.write,
        SimpleDescriptorEnum.create,
        SimpleDescriptorEnum.update,
        SimpleDescriptorEnum.delete,
      ]).has(des as SimpleDescriptorEnum)
    )
      throw new Error(`Invalid descriptor '${descriptor}'.`);
    // SimpleDescriptorEnum
    return descriptor;
  } else if (type === "object") {
    // SpecialDescriptor
    const des = descriptor as SpecialDescriptor;
    if (!Object.keys(des).every((key) => ["d", "roles"].includes(key)))
      throw new Error(`Invalid descriptor '${descriptor}'.`);
    assureDescriptor(des.d);
    if (!des.roles || (Array.isArray(des.roles) && des.roles.length === 0))
      throw new Error(`Invalid descriptor '${descriptor}'.`);

    if (!Array.isArray(des.roles))
      throw new Error(`Descriptor property roles must be an array type.`);
    const roles = des.roles.map(parseRegexOrString);
    des.roles = [roles.shift()!, ...roles];
  }

  return descriptor;
}
