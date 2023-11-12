import { z } from "zod";
import { Descriptor, GenericUser } from "../Types";
import { ACL } from "../ACL";
import { isObj } from "../utils/utils";

type E<D extends Descriptor> = {
  descriptor: D;
};

const fnsToExecute = ["shape", "unwrap"];

function findDescriptors(
  obj: any,
  path = "",
  paths: string[] = [],
  checked = new Set<any>([])
) {
  const typed = obj as unknown as E<Descriptor>;

  if (checked.has(obj)) return;
  checked.add(obj);

  if (typed?.descriptor) {
    paths.push(path);
  }

  if (obj) {
    Object.entries(obj).forEach(([key, val]) => {
      const keyIn = fnsToExecute.includes(key);
      if (typeof val === "function" && !keyIn) return;

      findDescriptors(
        keyIn && typeof val === "function" ? val() : val,
        `${path}.${key}`,
        paths,
        checked
      );
    });
  }
  if (path === "") console.log(paths.map((path) => `'${path}'`).join("\n"));
}

export function za<Z extends z.ZodType, D extends Descriptor>(des: D, zod: Z) {
  const extension: E<D> = {
    descriptor: des,
  };
  Object.assign(zod, extension);
  return zod as typeof extension & Z;
}

type ZAclE<Data extends {}, User extends GenericUser = GenericUser> = {
  acl: ACL;
};

export function ZAcl<
  Z extends z.ZodType,
  User extends GenericUser = GenericUser
>(zod: Z) {
  // Todo: create json from zod tree

  findDescriptors(zod);

  const extension: ZAclE<z.infer<Z>, User> = {
    acl: ACL.FromJson({}),
  };
  Object.assign(zod, extension);
  return zod as Z & typeof extension;
}
