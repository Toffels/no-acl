import { AccessControlList } from "./AccessControlList";
import { GenericUser } from "./Types";

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

  public read(data: Data) {
    return this.acl.read(data, this.user);
  }

  public write(data: Data) {
    return this.acl.write(data, this.user);
  }

  public create(data: Data) {
    return this.acl.create(data, this.user);
  }

  public update(data: Data) {
    return this.acl.update(data, this.user);
  }

  public delete(data: Data) {
    return this.acl.delete(data, this.user);
  }
}
