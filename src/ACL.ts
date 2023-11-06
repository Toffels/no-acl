import { InvalidInput } from "./errors/InvalidInput";
import { ThrowNotImplemented } from "./errors/NotImplemented";
import { VariableUndefined } from "./errors/VariableUndefined";
import { flatten } from "./utils";

enum SimpleDescriptor {
  //   i = "i",
  //   inherit = i,

  r = "r",
  read = r,

  w = "w",
  write = w,

  rw = "rw",
  readWrite = rw,
}

type Role = RegExp | string;

type VariableDescriptorKey = `@${string}`;

type SpecialDescriptor = { d: SimpleDescriptor; roles: Role };

type Descriptor =
  | SimpleDescriptor
  | VariableDescriptorKey
  | SpecialDescriptor
  | (SpecialDescriptor | SimpleDescriptor)[];

type AclJson = {
  /** Variables */
  [key: VariableDescriptorKey]: Descriptor;
  /** Description */
  [key: string]: Descriptor;
};

type Acl = {
  /** Description */
  [key: string]: Descriptor;
};

export class ACL<Data extends {}, User extends { roles: string[] }> {
  #acl: Acl;
  #vars: Acl;
  #aclJson: Acl;

  public toString(): string {
    const result: string[] = [];

    Object.entries({ ...this.#vars, ...this.#acl }).forEach(([key, value]) =>
      result.push(`${key}: ${value}`)
    );

    return result.join("\n");
  }

  public toJson() {
    return { ...this.#vars, ...this.#acl };
  }

  public get original() {
    return { ...this.#aclJson };
  }

  protected constructor(aclJson: AclJson) {
    this.#aclJson = aclJson;
    this.#acl = {};
    this.#vars = {
      "@r": SimpleDescriptor.r,
      "@read": SimpleDescriptor.read,
      "@w": SimpleDescriptor.w,
      "@write": SimpleDescriptor.write,
      "@rw": SimpleDescriptor.rw,
      "@readWrite": SimpleDescriptor.readWrite,
    };

    Object.entries(aclJson).forEach(([key, des]) => {
      if (key.startsWith("@")) {
        this.#vars[key] = des;
      } else {
        this.#acl[key] = des;
      }
    });
  }

  protected getRoles(user: User): string[] {
    return user.roles;
  }

  public read(data: Data, user: User) {
    return this.apply(data, user, SimpleDescriptor.read);
  }

  public write(data: Data, user: User) {
    return this.apply(data, user, SimpleDescriptor.write);
  }

  public readWrite(data: Data, user: User) {
    return this.apply(data, user, SimpleDescriptor.readWrite);
  }

  private apply(
    data: Data,
    user: User,
    /** filters the data by either read, write or both accesses. */
    type: SimpleDescriptor
  ) {
    const roles = this.getRoles(user);

    // Validate data input.
    this.checkData(data);

    const dataKeys = flatten(data);
    const aclKeys = Object.keys(this.#acl);
  }

  private getDescriptor(path: string): Descriptor | undefined {
    if (this.#acl[path]) {
      const descriptor = this.#acl[path];

      if (descriptor) {
        if (typeof descriptor === "string" && descriptor.startsWith("@")) {
          if (!this.#vars[descriptor])
            throw new VariableUndefined(
              `Variable '${descriptor}' used by '${path}' is not defined.`
            );
          return this.#vars[descriptor];
        }

        return descriptor;
      }
    } else {
      const segments = path.split(".");
      segments.pop();
      const parent = segments.join(".");

      return this.getDescriptor(parent);
    }
  }

  private checkData(data: Data) {
    if (typeof data !== "object") throw new InvalidInput(`Not of type object.`);
    if (data === null) throw new InvalidInput(`Can't be null.`);
  }

  public static FromJson(json: AclJson) {
    return new ACL(json);
  }

  public static FromZod(zod: Zod.AnyZodObject) {
    ThrowNotImplemented("FromZod");
    return new ACL({});
  }
}
