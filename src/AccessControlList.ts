import { InvalidInput } from "./errors/InvalidInput";
import { NotImplemented } from "./errors/NotImplemented";
import { VariableUndefined } from "./errors/VariableUndefined";
import { flatten, serializeRegex, setValueByPath } from "./utils/utils";
import {
  Acl,
  AclJson,
  ArrayDescriptor,
  Descriptor,
  GenericUser,
  SimpleDescriptorEnum,
  SDE,
  SpecialDescriptor,
  VariableDescriptorKey,
  Variables,
  Filter,
} from "./Types";
import { DeepPartialNullable, DeepPartial } from "./utils/DeepPartial";
import { serializeDescriptor } from "./utils/serialize";
import { assureDescriptor } from "./utils/parse";
import { getWildCardPaths } from "./utils/getWildCardPaths";
import { removeEmptyObjects } from "./utils/removeEmptyObjects";

function getParentPath(path: string) {
  const segments = path.split(".");
  segments.pop();
  const parent = segments.join(".");
  return parent;
}

export type Options<
  Vars extends Variables = Variables,
  User extends GenericUser = GenericUser
> = {
  vars?: Vars;
  /**
   * Falls back to:
   * ```(user: User) => user.roles```
   */
  getRoles?: (user: User) => string[];
  strict?: boolean;
};

export class AccessControlList<
  Data extends {} = {},
  User extends GenericUser = GenericUser,
  Vars extends Variables = Variables
> {
  #acl: Acl;
  #vars: Acl;
  #aclJson: Acl;

  private readonly keys: string[];

  public debug = false;

  public toString(
    /** Flushing means: To evaluate all variables and return a strict acl-object. */
    flush = false
  ): string {
    const result: string[] = [];

    Object.entries(this.toJson(flush)).forEach(([key, value]) =>
      result.push(
        `${key}: ${
          typeof value === "object"
            ? JSON.stringify(value, (key, value) => {
                if (typeof value === "object" && value instanceof RegExp)
                  return serializeRegex(value);

                return value;
              })
            : value
        }`
      )
    );

    return (
      result
        .sort((a, b) => {
          const _a = a.split(":").shift();
          const _b = b.split(":").shift();
          const ab = _a!.length - _b!.length;
          if (ab !== 0) return ab;
          return (_b as any) - (_a as any);
        })
        // .map((line) =>
        //   [
        //     line.substring(0, line.indexOf(":") + 1),
        //     line.substring(line.indexOf(":") + 2),
        //   ].join("\n   ")
        // )
        .join("\n")
    );
  }

  public toJson(
    /** Flushing means: To evaluate all variables and return a strict acl-object. */
    flush = false
  ) {
    if (flush) {
      const result = { ...this.#acl };

      while (
        Object.values(result).some(
          (value) =>
            (Array.isArray(value) &&
              value.some((v) => typeof v === "string" && v.startsWith("@"))) ||
            (typeof value === "string" && value.startsWith("@"))
        )
      ) {
        Object.entries(result).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            result[key] = value.map((value) => {
              if (typeof value === "string" && value.startsWith("@")) {
                const variable = this.#vars[value];
                if (!variable) return undefined;
                else if (
                  typeof variable === "string" &&
                  variable.startsWith("@")
                )
                  throw new NotImplemented(
                    `Variable cross referencing a variable is not supported yet.`
                  );
                else return variable;
              }
              return value;
            }) as Descriptor;
          } else if (typeof value === "string" && value.startsWith("@")) {
            const variable = this.#vars[value];
            if (!variable) delete result[key];
            else if (typeof variable === "string" && variable.startsWith("@"))
              throw new NotImplemented(
                `Variable cross referencing a variable is not supported yet.`
              );
            else result[key] = variable;
          }
        });
      }

      return result;
    }

    const result = { ...this.#vars, ...this.#acl };
    Object.keys(AccessControlList.#DefaultVars).forEach((key) => {
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
    "@n": SDE.n,
    "@none": SDE.none,
    "@null": SDE.null,

    "@never": SDE.never,

    "@r": SDE.r,
    "@read": SDE.read,
    "@w": SDE.w,
    "@write": SDE.write,
    "@rw": SDE.rw,
    "@readWrite": SDE.readWrite,

    "@c": SDE.c,
    "@create": SDE.c,
    "@u": SDE.u,
    "@update": SDE.update,
    "@d": SDE.d,
    "@delete": SDE.delete,
  };

  public copy(options?: Options<Vars, User>) {
    return AccessControlList.FromJson(
      { ...this.original },
      {
        vars: {
          ...this.options?.vars,
          ...options?.vars,
        },
        getRoles: this.options?.getRoles ?? options?.getRoles,
        strict: this.options?.strict ?? options?.strict,
      }
    );
  }

  private strict = true;

  protected constructor(
    aclJson: AclJson,
    private options?: Options<Vars, User>
  ) {
    const { strict } = options ?? {};
    if (strict === false) {
      // console.warn(`None-Strict-Mode is not entirely tested.`);
      this.strict = strict;
    }

    if (options?.getRoles) this.getRoles = options.getRoles;

    this.#aclJson = aclJson;
    this.#acl = {};
    this.#vars = {
      ...AccessControlList.#DefaultVars,
    };

    Object.entries(options?.vars ?? {}).forEach(([key, des]) => {
      if (key.startsWith("@")) {
        this.#vars[key] = assureDescriptor(des as Descriptor);
      }
    });

    Object.entries(aclJson).forEach(([key, des]) => {
      if (key.startsWith("@")) {
        this.#vars[key] = assureDescriptor(des);
      } else {
        this.#acl[key] = assureDescriptor(des);
      }
    });

    this.keys = Object.keys(this.#acl).sort();
  }

  /** Aggregates roles from a User object. */
  protected getRoles(user: User) {
    return user.roles;
  }

  /** Returns matching roles. */
  protected matchRoles(
    descriptor: SpecialDescriptor,
    user: User,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ): string[] {
    const userRoles = filter
      ? this.getRoles(user).filter(filter)
      : this.getRoles(user);
    const matches: string[] = [];
    const { roles } = descriptor;
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
  public read(
    data: Data,
    user: User,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.apply(data, user, SimpleDescriptorEnum.read, filter, undefined);
  }

  /** Modifies the input data object and removes any property that is not writable by the provided user. */
  public write(
    data: Data,
    user: User,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.apply(
      data,
      user,
      SimpleDescriptorEnum.write,
      filter,
      undefined
    );
  }

  public create(
    data: Data,
    user: User,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.apply(
      data,
      user,
      SimpleDescriptorEnum.create,
      filter,
      undefined
    );
  }

  public update(
    data: Data,
    user: User,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.apply(
      data,
      user,
      SimpleDescriptorEnum.update,
      filter,
      undefined
    );
  }

  public delete(
    data: Data,
    user: User,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.apply(
      data,
      user,
      SimpleDescriptorEnum.delete,
      filter,
      undefined
    );
  }

  public apply<Meta extends undefined | true>(
    data: Data,
    user: User,
    /** filters the data by either read, write or readWrite access. */
    type:
      | SimpleDescriptorEnum.read
      | SimpleDescriptorEnum.write
      | SimpleDescriptorEnum.create
      | SimpleDescriptorEnum.update
      | SimpleDescriptorEnum.delete,
    /** Filter to be applied to user roles. Default: () => true */
    filter: Filter | undefined,
    meta: Meta
  ): Meta extends true
    ? [
        data: DeepPartialNullable<Data>,
        removals: string[],
        roleTable: Record<string, string | string[] | undefined>,
        pathTable: Record<string, string | string[] | undefined>
      ]
    : DeepPartialNullable<Data> {
    // Validate data input.
    this.validate(data);

    // Remove empty objects, but also already deeply copy the source.
    const copy = removeEmptyObjects(data);

    // Flatten the data is an extra step, which will add cost on performance, but adds benefits for code readability and maintenance.
    const flatData = flatten(copy);
    // Sorting the keys will help to add removals early and therefore it can be used to skip further processing.
    const flatDataKeys = Object.keys(flatData).sort();

    const aclKeys = this.keys;

    // Setup tracking of to be removed keys.
    const removals: string[] = [];
    const paths: Record<string, undefined | string | string[]> = {};
    const roles: Record<string, undefined | string | string[]> = {};
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
                paths[key] ? ` ('${paths[key]}')` : ""
              } matches already removed key: '${matchingKeyInRemovals}'`
            );

          continue;
        }

        const [descriptor, _roles] = this.evalDescriptor(
          this.getDescriptor(key),
          user,
          type,
          filter
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
                paths[key] ? ` ('${paths[key]}')` : ""
              } based on descriptor: '${descriptor}' and roles: ${_roles}`
            );
          removals.push(key);
        }

        if (meta) {
          paths[key] = this.getDescriptor(key, true);
          roles[key] = _roles;
        }
      }

    if (this.debug) console.log(logs);

    for (var removal of removals) {
      setValueByPath(copy, removal, undefined);
    }

    const result = (
      meta === true
        ? ([removeEmptyObjects(copy), removals, roles, paths] as [
            data: DeepPartialNullable<Data>,
            removals: string[],
            roleTable: Record<string, string | string[] | undefined>,
            pathTable: Record<string, string | string[] | undefined>
          ])
        : removeEmptyObjects(copy)
    ) as Meta extends true
      ? [
          data: DeepPartialNullable<Data>,
          removals: string[],
          roleTable: Record<string, string | string[] | undefined>,
          pathTable: Record<string, string | string[] | undefined>
        ]
      : DeepPartialNullable<Data>;

    return result;
  }

  protected getProjection(
    path: string,
    user: User,
    /** filters the data by either read, write or readWrite access. */
    type:
      | SimpleDescriptorEnum.read
      | SimpleDescriptorEnum.write
      | SimpleDescriptorEnum.create
      | SimpleDescriptorEnum.update
      | SimpleDescriptorEnum.delete,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    const [descriptor, _roles] = this.evalDescriptor(
      this.getDescriptor(path),
      user,
      type,
      filter
    );

    // Checks whether the descriptor matches the input type.
    const matchTheType =
      type === descriptor || descriptor === SimpleDescriptorEnum.readWrite;

    // const hasWildcard = key.includes("*");
    // if (hasWildcard) console.warn(key, this.getDescriptor(key), descriptor);

    return matchTheType;
  }

  /** Check projection of  */
  public proj = (() => ({
    read: (
      path: string,
      user: User,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.getProjection(path, user, SDE.read, filter),
    write: (
      path: string,
      user: User,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.getProjection(path, user, SDE.write, filter),
    create: (
      path: string,
      user: User,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.getProjection(path, user, SDE.create, filter),
    update: (
      path: string,
      user: User,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.getProjection(path, user, SDE.update, filter),
    delete: (
      path: string,
      user: User,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.getProjection(path, user, SDE.delete, filter),
  }))();

  /** Gets the plain descriptor by path.
   * If explicit descriptor is not defined, it will implicitly try to find the ancient descriptor.
   */
  public get(path: string): Descriptor | undefined {
    return this.getDescriptor(path);
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

  public evalDescriptor(
    descriptor: Descriptor | undefined,
    user: User,
    /** filters the data by either read, write or readWrite access. */
    type:
      | SimpleDescriptorEnum.read
      | SimpleDescriptorEnum.write
      | SimpleDescriptorEnum.create
      | SimpleDescriptorEnum.update
      | SimpleDescriptorEnum.delete,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
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
      if (descriptor[0] === "@") {
        const variable = descriptor as VariableDescriptorKey;
        return this.evalDescriptor(this.#vars[variable], user, type, filter);
      }
      return [descriptor as SimpleDescriptorEnum];

      // ArrayDescriptor
    } else if (Array.isArray(descriptor)) {
      const evaluatedDescriptors = descriptor.map((_d) =>
        this.evalDescriptor(_d, user, type, filter)
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
        ) {
          return [d, r];
        }
      }

      // SpecialDescriptor
    } else if (
      Object.hasOwn(descriptor, "d") &&
      Object.hasOwn(descriptor, "roles")
    ) {
      const matchingRoles = this.matchRoles(descriptor, user);
      if (matchingRoles.length > 0) return [descriptor.d, matchingRoles];
    }

    // Falls back to No.
    if (this.strict) {
      if (this.debug && !roles)
        console.log(
          `evalDescriptor() [strict] couldn't be evaluated, returning none.`
        );

      return roles
        ? [SimpleDescriptorEnum.none, roles]
        : [SimpleDescriptorEnum.none];
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
    User extends GenericUser = GenericUser,
    Vars extends Variables = Variables
  >(json: AclJson, options?: Options<Vars, User>) {
    return new AccessControlList<Data, User>(json, options);
  }
}
