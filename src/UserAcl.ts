import { AccessControlList } from "./AccessControlList";
import { Filter, GenericUser, SDE } from "./Types";

export class UserAcl<
  Data extends {} = any,
  User extends GenericUser = { roles: string[] },
  Acl extends AccessControlList<Data, User> = AccessControlList<Data, User>
> {
  constructor(
    public readonly user: User,
    public readonly acl: Acl,
    /** Filter to be applied to user roles. Default: () => true */
    protected defaultFilter?: (role: string) => boolean
  ) {}

  /** Gets the plain descriptor by path.
   * If explicit descriptor is not defined, it will implicitly try to find the ancient descriptor.
   */
  public get(path: string) {
    return this.acl.get(path);
  }

  /** Check projection of  */
  public apply = (() => ({
    read: (
      data: Data,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.read(data, this.user, filter ?? this.defaultFilter),
    write: (
      data: Data,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.write(data, this.user, filter ?? this.defaultFilter),
    create: (
      data: Data,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.create(data, this.user, filter ?? this.defaultFilter),
    update: (
      data: Data,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.update(data, this.user, filter ?? this.defaultFilter),
    delete: (
      data: Data,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.delete(data, this.user, filter ?? this.defaultFilter),
  }))();

  /** Check projection of  */
  public proj = (() => ({
    read: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.read(path, this.user, filter ?? this.defaultFilter),
    write: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.write(path, this.user, filter ?? this.defaultFilter),
    create: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.create(path, this.user, filter ?? this.defaultFilter),
    update: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.update(path, this.user, filter ?? this.defaultFilter),
    delete: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.delete(path, this.user, filter ?? this.defaultFilter),
  }))();

  /** Check projection of  */
  public evalPath = (() => ({
    read: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.read(path, this.user, filter ?? this.defaultFilter),
    write: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.write(path, this.user, filter ?? this.defaultFilter),
    create: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) =>
      this.acl.evalPath.create(path, this.user, filter ?? this.defaultFilter),
    update: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) =>
      this.acl.evalPath.update(path, this.user, filter ?? this.defaultFilter),
    delete: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) =>
      this.acl.evalPath.delete(path, this.user, filter ?? this.defaultFilter),
  }))();
}
