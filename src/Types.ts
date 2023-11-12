export enum SimpleDescriptorEnum {
  n = "n",
  none = n,
  null = n,

  /** The SimpleDescriptor.never can be used to terminate further ArrayDescriptor evaluation. */
  never = "never",

  r = "r",
  read = r,

  w = "w",
  write = w,

  rw = "rw",
  readWrite = rw,
}

export const SDE = SimpleDescriptorEnum;

export type Role = RegExp | string;

export type VariableDescriptorKey = `@${string}`;

export type NeverDescriptor = SimpleDescriptorEnum.never;

export type SimpleDescriptor =
  | SimpleDescriptorEnum.none
  | SimpleDescriptorEnum.read
  | SimpleDescriptorEnum.write
  | SimpleDescriptorEnum.readWrite;

export type SpecialDescriptor = {
  d: SimpleDescriptor | NeverDescriptor;
  roles: Role | [Role, ...Role[]];
};

export type ArrayDescriptor = [
  SpecialDescriptor | SimpleDescriptor,
  ...(SpecialDescriptor | SimpleDescriptor)[]
];

export type Descriptor =
  | NeverDescriptor
  | SimpleDescriptor
  | VariableDescriptorKey
  | SpecialDescriptor
  | ArrayDescriptor;

export type AclJson = {
  /** Variables */
  [key: VariableDescriptorKey]: Descriptor;
  /** Description */
  [key: string]: Descriptor;
};

export type Acl = {
  [key: string]: Descriptor;
};

export type GenericUser = { roles: string[] };
