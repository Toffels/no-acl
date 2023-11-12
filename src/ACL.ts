import { InvalidInput } from "./errors/InvalidInput";
import { NotImplemented } from "./errors/NotImplemented";
import { VariableUndefined } from "./errors/VariableUndefined";
import { flatten, setValueByPath } from "./utils";
import {
  Acl,
  AclJson,
  ArrayDescriptor,
  Descriptor,
  GenericUser,
  SimpleDescriptorEnum,
  SpecialDescriptor,
  VariableDescriptorKey,
} from "./Types";
import { DeepPartial } from "./DeepPartial";
import { serializeDescriptor } from "./serialize";
import { assureDescriptor } from "./parse";
import { z } from "zod";
import { FromZod } from "./FromZod";
import { getWildCardPaths } from "./getWildCardPaths";

function getParentPath(path: string) {
  const segments = path.split(".");
  segments.pop();
  const parent = segments.join(".");
  return parent;
}

export class ACL<Data extends {} = {}, User extends GenericUser = GenericUser> {
  #acl: Acl;
  #vars: Acl;
  #aclJson: Acl;

  public get acl() {
    return { ...this.#acl };
  }

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

    // Serialize the regex's
    Object.entries(result).forEach(([key, val]) => {
      result[key] = serializeDescriptor(val);
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
        this.#vars[key] = assureDescriptor(des);
      } else {
        this.#acl[key] = assureDescriptor(des);
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
    const match: Record<string, undefined | string | string[]> = {};
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
              `  Skip: '${key}'${
                match[key] ? ` ('${match[key]}')` : ""
              } matches already removed key: '${matchingKeyInRemovals}'`
            );

          continue;
        }

        if (this.debug) match[key] = this.getDescriptor(key, true);
        const [descriptor, roles] = this.evalDescriptor(
          this.getDescriptor(key),
          user,
          type
        );

        // Checks whether the descriptor matches the input type.
        const matchTheType =
          type === descriptor || descriptor === SimpleDescriptorEnum.readWrite;

        const hasWildcard = key.includes("*");

        // If not, add key to removals.
        if (!matchTheType && !hasWildcard) {
          if (this.debug)
            logs.push(
              `Remove: '${key}'${
                match[key] ? ` ('${match[key]}')` : ""
              } based on descriptor: '${descriptor}' and roles: ${roles}`
            );
          removals.push(key);
        }
      }

    if (this.debug) {
      console.log(logs);
      console.log(match);
    }

    for (var removal of removals) {
      setValueByPath(data, removal, undefined);
    }

    return [data, removals] as [data: DeepPartial<Data>, removals: string[]];
  }

  /** Gets the plain descriptor by path.
   * If explicit descriptor is not defined, it will implicitly try to find the ancient descriptor.
   */
  private getDescriptor(path: string): Descriptor | undefined;
  private getDescriptor(
    path: string,
    debug: true
  ): string | string[] | undefined;
  private getDescriptor(
    path: string,
    debug = false
  ): Descriptor | string | string[] | undefined {
    if (this.#acl[path]) {
      const descriptor = this.#acl[path];

      if (descriptor) {
        // Evaluate variable descriptor.
        if (typeof descriptor === "string" && descriptor.startsWith("@")) {
          if (!this.#vars[descriptor])
            throw new VariableUndefined(
              `Variable '${descriptor}' used by '${path}' is not defined.`
            );
          return debug ? descriptor : this.#vars[descriptor];
        }

        // Return found descriptor.
        return debug ? path : descriptor;
      }
    } else {
      const wildcards = getWildCardPaths(path, Object.keys(this.#acl))?.sort();
      // console.log(path, wildcards);
      if (wildcards) {
        const descriptors = wildcards
          .map((wildcard) => this.getDescriptor(wildcard))
          .reduce(
            (result: ArrayDescriptor, current: Descriptor | undefined) => {
              if (Array.isArray(current))
                return <ArrayDescriptor>[...result, ...current];
              if (current) return <ArrayDescriptor>[...result, current];
              return result;
            },
            [] as unknown as ArrayDescriptor
          );
        return debug ? wildcards : descriptors;
      }

      // Use implicit inheritance to find a matching parent descriptor.
      const parent = getParentPath(path);
      // Return undefined, if no matching descriptor was found.
      if (parent === "") return undefined;

      return this.getDescriptor(parent, debug as true);
    }
  }

  private evalDescriptor(
    descriptor: Descriptor | undefined,
    user: User,
    /** filters the data by either read, write or readWrite access. */
    type: SimpleDescriptorEnum.read | SimpleDescriptorEnum.write
  ): [descriptor: SimpleDescriptorEnum, roles?: string[]] {
    if (descriptor === undefined) {
      // Falls back to No.
      if (this.strict) {
        if (this.debug)
          console.log(
            "evalDescriptor() [strict] descriptor was undefined, returning none."
          );
        return [SimpleDescriptorEnum.none];
      }
      // Falls back to YES.
      return [SimpleDescriptorEnum.readWrite];
    }

    let roles: string[] | undefined;

    // SimpleDescriptor or VariableDescriptor
    if (typeof descriptor === "string") {
      if (descriptor.startsWith("@")) {
        const variable = descriptor as VariableDescriptorKey;
        return this.evalDescriptor(this.#vars[variable], user, type);
      }
      return [descriptor as SimpleDescriptorEnum];

      // ArrayDescriptor
    } else if (Array.isArray(descriptor)) {
      const evaluatedDescriptors = descriptor.map((_d) =>
        this.evalDescriptor(_d, user, type)
      );

      const neverDescriptor = evaluatedDescriptors.find(
        ([d]) => d === SimpleDescriptorEnum.never
      );

      // Force opt out when never descriptor is found!
      if (neverDescriptor) return neverDescriptor;

      for (const descriptor of evaluatedDescriptors) {
        const [d, r] = descriptor;

        const matchTheType = type === d || d === SimpleDescriptorEnum.readWrite;

        // If it hits a SimpleDescriptor that matches, it's fine - take it.
        if (!r && matchTheType) return [d];
        else roles = r;
        // If there is matching roles and it's not a none-descriptor return first match.
        if (
          ((r?.length ?? 0) > 0 && matchTheType) ||
          d === SimpleDescriptorEnum.readWrite
        )
          return [d, r];
      }

      // SpecialDescriptor
    } else {
      const matchingRoles = this.matchRoles(descriptor, user);
      if (matchingRoles.length > 0) return [descriptor.d, matchingRoles];
    }

    // Falls back to No.
    if (this.strict) {
      if (this.debug && !roles)
        console.log(
          `evalDescriptor() [strict] couldn't be evaluated, returning none.`
        );
      return [SimpleDescriptorEnum.none, roles];
    }
    // Falls back to YES.
    return [SimpleDescriptorEnum.readWrite];
  }

  private validate(data: Data) {
    if (typeof data !== "object") throw new InvalidInput(`Not of type object.`);
    if (data === null) throw new InvalidInput(`Can't be null.`);
    if (data === undefined) throw new InvalidInput(`Can't be undefined.`);
  }

  public static FromJson<
    Data extends {} = any,
    User extends GenericUser = GenericUser
  >(json: AclJson, strict = true) {
    return new ACL<Data, User>(json, strict);
  }

  public static FromZod(zod: z.AnyZodObject) {
    const json = FromZod(zod);
    return new ACL(json);
  }
}
