import {
  z,
  ZodEffects,
  ZodObject,
  ZodRecord,
  ZodUnion,
  ZodIntersection,
  ZodArray,
  ZodOptional,
  ZodDefault,
  ZodDefaultDef,
  ZodType,
  ZodRecordDef,
} from "zod";
import { Acl, Descriptor, GenericUser, Variables } from "../Types";
import { ACL, Options } from "../ACL";

//// EXPORT functionality. ////////////////////////////////////////////////////////

type ZodAcl<
  Z extends ZodType,
  User extends GenericUser,
  Vars extends Variables = Variables
> = Z & {
  acl: ACL<z.infer<Z>, User, Vars>;
};

declare module "zod" {
  interface ZodType {
    descriptor: Descriptor;
    a: <Z extends z.ZodType, D extends Descriptor>(
      this: Z,
      descriptor: D
    ) => Z & { descriptor: D };
    assignDescriptor: <Z extends z.ZodType, D extends Descriptor>(
      this: Z,
      descriptor: D
    ) => Z & { descriptor: D };
    A: <Z extends z.ZodType, User extends GenericUser, Vars extends Variables>(
      this: Z,
      options?: Options<Vars, User>
    ) => ZodAcl<Z, User>;
    AssignAcl: <
      Z extends z.ZodType,
      User extends GenericUser,
      Vars extends Variables
    >(
      this: Z,
      options?: Options<Vars, User>
    ) => ZodAcl<Z, User>;
    // infered: z.infer<this>;
  }
}

ZodType.prototype.a = function <Z extends z.ZodType, D extends Descriptor>(
  this: ZodType,
  descriptor: D
) {
  this.descriptor = descriptor;
  return this as Z & { descriptor: D };
};
ZodType.prototype.assignDescriptor = ZodType.prototype.a;

ZodType.prototype.A = function <
  Z extends z.ZodType,
  User extends GenericUser,
  Vars extends Variables
>(this: Z, options?: Options<Vars, User>) {
  const json = getDescriptor(this, "", true);
  const acl = ACL.FromJson<z.infer<Z>, User, Vars>(json, options);

  Object.assign(this, { acl });
  return this as ZodAcl<Z, User, Vars>;
};
ZodType.prototype.AssignAcl = ZodType.prototype.A;

export function a<Z extends z.ZodType, D extends Descriptor>(des: D, zod: Z) {
  const extension = {
    descriptor: des,
  };
  Object.assign(zod, extension);
  return zod as Z & { descriptor: D };
}
export const assignDescriptor = a;

export function A<
  Z extends z.ZodType,
  User extends GenericUser,
  Vars extends Variables
>(
  zod: Z,
  options?: Options<Vars, User>,
  debug?: boolean
): ZodAcl<Z, User, Vars> {
  const json = getDescriptor(zod, "", true, debug);
  const acl = ACL.FromJson<z.infer<Z>, User, Vars>(json, options);

  Object.assign(zod, { acl });
  return zod as ZodAcl<Z, User, Vars>;
}
export const AssignAcl = A;

//// /////////////////////////////////////////////////////////////////////////////

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
  deep = true,
  debug = false
) {
  const acl: Acl = {};

  if (path && zod?.descriptor) {
    acl[path] = zod.descriptor;

    if (!deep) return acl;
  }

  const shape = findShape(zod);
  if (shape) {
    Object.assign(
      acl,
      Object.entries(shape).reduce((result, [key, value]) => {
        return {
          ...result,
          ...getDescriptor(value as any, createPath(path, key), deep, debug),
        };
      }, {})
    );

    return acl;
  }

  if (zod instanceof ZodIntersection) {
    const left = zod._def.left as ZodType;
    const right = zod._def.right as ZodType;
    const options = [left, right] as [ZodType, ZodType];

    const optionDescriptors = options.map((o) =>
      getDescriptor(o as any, path, deep, debug)
    );

    if (debug)
      console.warn(
        `Intersection descriptors will overwrite by order they are evaluated. [${optionDescriptors
          .map(
            (option) =>
              `[${Object.keys(option)
                .filter((key) => key !== path)
                .join(", ")}]`
          )
          .join(", ")}]`
      );
    const result = {};
    Object.assign(result, ...optionDescriptors, acl);
    return result;
  }

  if (zod instanceof ZodRecord) {
    acl[path] = zod.descriptor;

    const wildcardPath = createPath(path, "*");
    acl[wildcardPath] = zod.descriptor;

    const recordDefinition = zod._def as ZodRecordDef;
    const valueDefinition = getDescriptor(
      recordDefinition.valueType,
      wildcardPath,
      deep,
      debug
    );

    Object.assign(acl, valueDefinition);
  }

  if (zod instanceof ZodUnion) {
    const optionDescriptors = Object.keys(zod._def.options).map((o) =>
      getDescriptor(zod._def.options[o] as any, path, deep, debug)
    );

    if (debug)
      console.warn(
        `Union descriptors will overwrite by order they are evaluated. [${[
          { [path]: acl[path] },
          ...optionDescriptors,
        ]
          .map((option) => `[${Object.values(option).join(", ")}]`)
          .join(", ")}]`
      );
    const result = {};
    Object.assign(result, ...optionDescriptors, acl);
    return result;
  }

  if ((zod?._def as ZodDefaultDef)?.innerType) {
    const def = (zod._def as ZodDefaultDef)
      .innerType as ZodDefaultDef["innerType"];

    if (def.descriptor) {
      acl[path] = def.descriptor;
    }
    return acl;
  }

  return acl;
}
