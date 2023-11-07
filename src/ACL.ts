import * as z from "zod";
import { InvalidInput } from "./errors/InvalidInput";
import { NotImplemented, ThrowNotImplemented } from "./errors/NotImplemented";
import { VariableUndefined } from "./errors/VariableUndefined";
import { flatten } from "./utils";

export enum SimpleDescriptor {
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

type SpecialDescriptor = {
  d: SimpleDescriptor;
  roles: Role | [Role, ...Role[]];
};

type Descriptor =
  | SimpleDescriptor
  | VariableDescriptorKey
  | SpecialDescriptor
  | [
      SpecialDescriptor | SimpleDescriptor,
      ...(SpecialDescriptor | SimpleDescriptor)[]
    ];

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

export class ACL<
  Data extends {} = {},
  User extends { roles: string[] } = { roles: string[] }
> {
  #acl: Acl;
  #vars: Acl;
  #aclJson: Acl;

  public toString(
    /** Flushing means: To evaluate all variables and return a strict acl-object. */
    flush = false
  ): string {
    const result: string[] = [];

    Object.entries(this.toJson(flush)).forEach(([key, value]) =>
      result.push(`${key}: ${value}`)
    );

    return result.join("\n");
  }

  public toJson(
    /** Flushing means: To evaluate all variables and return a strict acl-object. */
    flush = false
  ) {
    if (flush) {
      const result = { ...this.#acl };

      Object.entries(this.#acl).forEach(([key, value]) => {
        if (typeof value === "string" && value.startsWith("@")) {
          const variable = this.#vars[value];
          if (!variable) delete result[key];
          else if (typeof variable === "string" && variable.startsWith("@"))
            throw new NotImplemented(
              `Variable cross referencing a variable is not supported yet.`
            );
          else result[key] = variable;
        }
      });

      return result;
    }

    const result = { ...this.#vars, ...this.#acl };
    Object.keys(ACL.#DefaultVars).forEach((key) => {
      delete result[key];
    });
    return result;
  }

  public get original() {
    return { ...this.#aclJson };
  }

  static readonly #DefaultVars = {
    "@r": SimpleDescriptor.r,
    "@read": SimpleDescriptor.read,
    "@w": SimpleDescriptor.w,
    "@write": SimpleDescriptor.write,
    "@rw": SimpleDescriptor.rw,
    "@readWrite": SimpleDescriptor.readWrite,
  };

  protected constructor(aclJson: AclJson) {
    this.#aclJson = aclJson;
    this.#acl = {};
    this.#vars = {
      ...ACL.#DefaultVars,
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

    for (var key of aclKeys) {
    }
  }

  private getDescriptor(path: string): Descriptor | undefined {
    if (this.#acl[path]) {
      const descriptor = this.#acl[path];

      if (descriptor) {
        // Evaluate variable descriptor.
        if (typeof descriptor === "string" && descriptor.startsWith("@")) {
          if (!this.#vars[descriptor])
            throw new VariableUndefined(
              `Variable '${descriptor}' used by '${path}' is not defined.`
            );
          return this.#vars[descriptor];
        }

        // Return found descriptor.
        return descriptor;
      }
    } else {
      // Use implicit inheritance to find a matching parent descriptor.
      const segments = path.split(".");
      segments.pop();
      const parent = segments.join(".");

      // Return undefined, if no matching descriptor was found.
      if (parent === "") return undefined;

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

  public static FromZod(zod: z.AnyZodObject) {
    ThrowNotImplemented("FromZod");
    return new ACL({});
  }
}
