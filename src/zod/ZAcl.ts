import {
  ZodEffects,
  ZodObject,
  ZodRecord,
  ZodUnion,
  ZodIntersection,
  z,
  ZodArray,
  ZodOptional,
  ZodDefault,
  ZodAnyDef,
  ZodDefaultDef,
  ZodTypeAny,
  ZodType,
  ZodRecordDef,
  ZodFunction,
} from "zod";
import { Acl, Descriptor, GenericUser } from "../Types";
import { ACL } from "../ACL";
import { isObj } from "../utils/utils";

type E<D extends Descriptor = Descriptor> = {
  descriptor: D;
};

const fnsToExecute = ["shape", "unwrap"];

function findDescriptors(
  obj: any,
  path = "",
  paths: string[] = [],
  checked = new Set<any>([])
) {
  const typed = obj as unknown as E;

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

function createPath(path: string, key: string) {
  return `${path === "" ? "" : `${path}.`}${key}`;
}

function findShape<Z extends z.ZodType>(zod: Z) {
  if (zod instanceof ZodObject) {
    return zod.shape;
  } else if (zod instanceof ZodOptional) {
    return zod.unwrap();
  } else if (zod instanceof ZodEffects) {
    return zod._def.schema;
  } else if (zod instanceof ZodUnion) {
    return zod._def.options;
  } else if (zod instanceof ZodArray) {
    return zod._def.type;
  } else if (zod instanceof ZodDefault) {
    return zod._def.innerType;
  }

  return null;
}

function getDescriptor<Z extends z.ZodType, D extends Descriptor>(
  zod: Z,
  path = "",
  deep = true
) {
  const acl: Acl = {};

  if (path && (zod as Z & E)?.descriptor) {
    acl[path] = (zod as Z & E).descriptor;

    if (!deep) return acl;
  }

  const shape = findShape(zod);
  if (shape) {
    Object.assign(
      acl,
      Object.entries(shape).reduce((result, [key, value]) => {
        return {
          ...result,
          ...getDescriptor(value as any, createPath(path, key)),
        };
      }, {})
    );

    return acl;
  }

  if (zod instanceof ZodIntersection) {
    const left = zod._def.left as ZodType & E;
    const right = zod._def.right as ZodType & E;
    const options = [left, right] as [ZodType & E, ZodType & E];

    const descriptors = options.map((o) =>
      getDescriptor(o as any, path, false)
    );
    const d0 = JSON.stringify(descriptors[0]);

    if (
      descriptors.length === 1 ||
      (descriptors.length > 0 &&
        // ToDo improve on this check -.-
        descriptors.every((d) => d0 === JSON.stringify(d)))
    ) {
      Object.assign(
        acl,
        descriptors.find(Boolean),
        ...options.map((o) => getDescriptor(o as any, path))
      );

      return acl;
    }

    if (descriptors.length > 0) {
      const error = new Error(
        `Found multiple definitions for acl on ZodIntersection.\n${path} ${JSON.stringify(
          descriptors
        )}`
      );
      console.log(error);
    }
  }

  if (zod instanceof ZodRecord) {
    acl[path] = (zod as unknown as E).descriptor;

    const wildcardPath = createPath(path, "*");
    acl[wildcardPath] = (zod as unknown as E).descriptor;

    const recordDefinition = zod._def as ZodRecordDef;
    const valueDefinition = getDescriptor(
      recordDefinition.valueType,
      wildcardPath
    );

    Object.assign(acl, valueDefinition);
  }

  if ((zod?._def as ZodDefaultDef)?.innerType) {
    const def = (zod._def as ZodDefaultDef)
      .innerType as ZodDefaultDef["innerType"] & E;

    if (def.descriptor) {
      acl[path] = def.descriptor;
    }
    return acl;
  }

  return acl;
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

  // findDescriptors(zod);
  const json = getDescriptor(zod);

  const extension: ZAclE<z.infer<Z>, User> = {
    acl: ACL.FromJson(json),
  };
  Object.assign(zod, extension);
  return zod as Z & typeof extension;
}
