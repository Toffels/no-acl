import * as z from "zod";
import { InvalidInput } from "./errors/InvalidInput";
import { NotImplemented, ThrowNotImplemented } from "./errors/NotImplemented";
import { VariableUndefined } from "./errors/VariableUndefined";
import { flatten } from "./utils";
import {
  Acl,
  AclJson,
  Descriptor,
  GenericUser,
  SimpleDescriptorEnum,
  SpecialDescriptor,
  VariableDescriptorKey,
} from "./Types";
import { DeepPartial } from "./DeepPartial";

export class ACL<Data extends {} = {}, User extends GenericUser = GenericUser> {
  #acl: Acl;
  #vars: Acl;
  #aclJson: Acl;

  public debug = false;

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
    "@n": SimpleDescriptorEnum.n,
    "@none": SimpleDescriptorEnum.none,
    "@null": SimpleDescriptorEnum.null,
    "@never": SimpleDescriptorEnum.never,
    "@r": SimpleDescriptorEnum.r,
    "@read": SimpleDescriptorEnum.read,
    "@w": SimpleDescriptorEnum.w,
    "@write": SimpleDescriptorEnum.write,
    "@rw": SimpleDescriptorEnum.rw,
    "@readWrite": SimpleDescriptorEnum.readWrite,
  };

  protected constructor(aclJson: AclJson, private strict = true) {
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

  /** Aggregates roles from a User object. */
  protected getRoles(user: User) {
    return user.roles;
  }

  /** Returns matching roles. */
  protected matchRoles(descriptor: SpecialDescriptor, user: User): string[] {
    const userRoles = this.getRoles(user);
    const matches: string[] = [];
    const roles = Array.isArray(descriptor.roles)
      ? descriptor.roles
      : [descriptor.roles];
    for (const role of roles) {
      if (typeof role === "string" && userRoles.includes(role)) {
        matches.push(role);
      } else if (role instanceof RegExp) {
        const regEx = role;
        matches.push(...userRoles.filter((role) => regEx.test(role)));
      }
    }
    return matches;
  }

  /** Modifies the input data object and removes any property that is not readable by the provided user. */
  public read(data: Data, user: User) {
    return this.apply(data, user, SimpleDescriptorEnum.read);
  }

  /** Modifies the input data object and removes any property that is not writable by the provided user. */
  public write(data: Data, user: User) {
    return this.apply(data, user, SimpleDescriptorEnum.write);
  }

  private apply(
    data: Data,
    user: User,
    /** filters the data by either read, write or readWrite access. */
    type: SimpleDescriptorEnum.read | SimpleDescriptorEnum.write
  ) {
    // Validate data input.
    this.validate(data);

    // Flatten the data is an extra step, which will add cost on performance, but adds benefits for code readability and maintenance.
    const flatData = flatten(data);
    // Sorting the keys will help to add removals early and therefore it can be used to skip further processing.
    const flatDataKeys = Object.keys(flatData).sort();

    const aclKeys = Object.keys(this.#acl).sort();

    // Setup tracking of to be removed keys.
    const removals: string[] = [];
    const logs: string[] = [];

    if (this.debug) console.log("flatDataKeys", flatDataKeys);

    for (var keys of [aclKeys, flatDataKeys])
      for (var key of keys) {
        const matchingKeyInRemovals = removals.find(
          (removal) =>
            key === removal ||
            // Is full segment.
            (key.replace(removal, "")[0] === "." &&
              // And is part of the path
              key.startsWith(removal))
        );

        if (matchingKeyInRemovals) {
          if (this.debug)
            logs.push(
              `  Skip: '${key}' matches already removed key: '${matchingKeyInRemovals}'`
            );
          continue;
        }

        const [descriptor, roles] = this.evalDescriptor(
          this.getDescriptor(key),
          user
        );

        // Checks whether the descriptor matches the input type.
        const matchTheType =
          type === descriptor || descriptor === SimpleDescriptorEnum.readWrite;

        // If not, add key to removals.
        if (!matchTheType) {
          if (this.debug)
            logs.push(
              `Remove: '${key}' based on descriptor: '${descriptor}' and roles: ${roles}`
            );
          removals.push(key);
        }
      }

    if (this.debug) console.log(logs);

    return [data, removals] as [data: DeepPartial<Data>, removals: string[]];
  }

  /** Gets the plain descriptor by path.
   * If explicit descriptor is not defined, it will implicitly try to find the ancient descriptor.
   */
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

  private evalDescriptor(
    descriptor: Descriptor | undefined,
    user: User
  ): [descriptor: SimpleDescriptorEnum, roles?: string[]] {
    if (descriptor === undefined) {
      // Falls back to No.
      if (this.strict) return [SimpleDescriptorEnum.none];
      // Falls back to YES.
      return [SimpleDescriptorEnum.readWrite];
    }

    // SimpleDescriptor or VariableDescriptor
    if (typeof descriptor === "string") {
      if (descriptor.startsWith("@")) {
        const variable = descriptor as VariableDescriptorKey;
        return this.evalDescriptor(this.#vars[variable], user);
      }
      return [descriptor as SimpleDescriptorEnum];

      // ArrayDescriptor
    } else if (Array.isArray(descriptor)) {
      const descriptors = descriptor;
      for (const descriptor of descriptors) {
        const [d, r] = this.evalDescriptor(descriptor, user);

        // A never-descriptor functions contraire to the default behavior of a array-descriptor: iterating until a positive match is found. Instead it opt's out.
        if (d === SimpleDescriptorEnum.never) return [d, r];
        // If there is matching roles and it's not a none-descriptor return first match.
        if ((r?.length ?? 0) > 0 && d !== SimpleDescriptorEnum.none)
          return [d, r];
      }

      // SpecialDescriptor
    } else {
      const matchingRoles = this.matchRoles(descriptor, user);
      if (matchingRoles.length > 0) return [descriptor.d, matchingRoles];
    }

    // Falls back to No.
    if (this.strict) return [SimpleDescriptorEnum.none];
    // Falls back to YES.
    return [SimpleDescriptorEnum.readWrite];
  }

  private validate(data: Data) {
    if (typeof data !== "object") throw new InvalidInput(`Not of type object.`);
    if (data === null) throw new InvalidInput(`Can't be null.`);
    if (data === undefined) throw new InvalidInput(`Can't be undefined.`);
  }

  public static FromJson(json: AclJson, strict = true) {
    return new ACL(json, strict);
  }

  public static FromZod(zod: z.AnyZodObject) {
    ThrowNotImplemented("FromZod");
    return new ACL({});
  }
}
