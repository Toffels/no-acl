import { AccessControlList } from "./AccessControlList";
import { Filter, GenericUser, SDE } from "./Types";

export class UserAcl<
  Data extends {} = any,
  User extends GenericUser = { roles: string[] },
  Acl extends AccessControlList<Data, User> = AccessControlList<Data, User>
> {
  public readonly user: User;
  public readonly acl: Acl;

  constructor(user: User, acl: Acl) {
    this.user = user;
    this.acl = acl;
  }

  public read(
    data: Data,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.acl.read(data, this.user, filter);
  }

  public write(
    data: Data,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.acl.write(data, this.user, filter);
  }

  public create(
    data: Data,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.acl.create(data, this.user, filter);
  }

  public update(
    data: Data,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.acl.update(data, this.user, filter);
  }

  public delete(
    data: Data,
    /** Filter to be applied to user roles. Default: () => true */
    filter?: Filter
  ) {
    return this.acl.delete(data, this.user, filter);
  }

  /** Check projection of  */
  public proj = (() => ({
    read: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.read(path, this.user, filter),
    write: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.write(path, this.user, filter),
    create: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.create(path, this.user, filter),
    update: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.update(path, this.user, filter),
    delete: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.proj.delete(path, this.user, filter),
  }))();

  /** Check projection of  */
  public evalPath = (() => ({
    read: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.read(path, this.user, filter),
    write: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.write(path, this.user, filter),
    create: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.create(path, this.user, filter),
    update: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.update(path, this.user, filter),
    delete: (
      path: string,
      /** Filter to be applied to user roles. Default: () => true */
      filter?: Filter
    ) => this.acl.evalPath.delete(path, this.user, filter),
  }))();
}
