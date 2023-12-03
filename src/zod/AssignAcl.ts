import type {
  z,
  infer as zinfer,
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
  ZodArrayDef,
  TypeOf,
} from "zod";
import { Acl, Descriptor, GenericUser, Variables } from "../Types";
import { AccessControlList, Options } from "../AccessControlList";

//// EXPORT functionality. ////////////////////////////////////////////////////////

type ZodAcl<
  Z extends ZodType,
  User extends GenericUser,
  Vars extends Variables = Variables
> = Z & {
  noacl: AccessControlList<zinfer<Z>, User, Vars>;
};

declare module "zod" {
  interface ZodType {
    descriptor: Descriptor;
    a: <Z extends ZodType, D extends Descriptor>(
      this: Z,
      descriptor: D
    ) => Z & { descriptor: D };
    assignDescriptor: <Z extends ZodType, D extends Descriptor>(
      this: Z,
      descriptor: D
    ) => Z & { descriptor: D };
    A: <Z extends ZodType, User extends GenericUser, Vars extends Variables>(
      this: Z,
      options?: Options<Vars, User>
    ) => ZodAcl<Z, User>;
    AssignAcl: <
      Z extends ZodType,
      User extends GenericUser,
      Vars extends Variables
    >(
      this: Z,
      options?: Options<Vars, User>
    ) => ZodAcl<Z, User>;
    // infered: z.infer<this>;
  }
}

let Z: any;

export function zInit(
  z: {
    ZodEffects: new (...args: any[]) => ZodEffects<any>;
    ZodObject: new (...args: any[]) => ZodObject<any>;
    ZodRecord: new (...args: any[]) => ZodRecord<any>;
    ZodUnion: new (...args: any[]) => ZodUnion<any>;
    ZodIntersection: new (...args: any[]) => ZodIntersection<any, any>;
    ZodArray: new (...args: any[]) => ZodArray<any>;
    ZodOptional: new (...args: any[]) => ZodOptional<any>;
    ZodDefault: new (...args: any[]) => ZodDefault<any>;
  },
  warn = true
) {
  Z = z;
  const ztype = (z as any)["ZodType"] as typeof ZodType;

  if (
    warn &&
    (!!ztype.prototype.assignDescriptor || !!ztype.prototype.AssignAcl)
  )
    console.warn(`Re-extending zod.`);

  ztype.prototype.assignDescriptor = function <
    Z extends ZodType,
    D extends Descriptor
  >(this: ZodType, descriptor: D) {
    this.descriptor = descriptor;
    return this as Z & { descriptor: D };
  };

  if (!ztype.prototype.a) ztype.prototype.a = ztype.prototype.assignDescriptor;

  ztype.prototype.AssignAcl = function <
    Z extends ZodType,
    User extends GenericUser,
    Vars extends Variables
  >(this: Z, options?: Options<Vars, User>) {
    let noacl: AccessControlList<TypeOf<Z>, User, Variables>;

    Object.assign(ztype, {
      // Temp.
      noacl: "_",
    });

    Object.defineProperty(this, "noacl", {
      get: function () {
        if (noacl) return noacl;
        const json = getDescriptor(this, "", true);
        noacl = AccessControlList.FromJson<zinfer<Z>, User, Vars>(
          json,
          options
        );
        return noacl;
      },
    });

    return this as ZodAcl<Z, User, Vars>;
  };

  if (!ztype.prototype.A) ztype.prototype.A = ztype.prototype.AssignAcl;
}

function Instanceof(zod: ZodType, className: string) {
  if (!Z[className]) {
    console.warn(`Unknown: "${className}"`);
    return false;
  }

  return zod instanceof Z[className];
}

export function a<Z extends ZodType, D extends Descriptor>(des: D, zod: Z) {
  const extension = {
    descriptor: des,
  };
  Object.assign(zod, extension);
  return zod as Z & { descriptor: D };
}
export const assignDescriptor = a;

export function A<
  Z extends ZodType,
  User extends GenericUser,
  Vars extends Variables
>(
  zod: Z,
  options?: Options<Vars, User>,
  debug?: boolean
): ZodAcl<Z, User, Vars> {
  let noacl: AccessControlList<TypeOf<Z>, User, Variables>;

  Object.assign(zod, {
    // Temp.
    noacl: "_",
  });

  Object.defineProperty(zod, "noacl", {
    get: function () {
      if (noacl) return noacl;
      const json = getDescriptor(zod, "", true, debug);
      noacl = AccessControlList.FromJson<zinfer<Z>, User, Vars>(json, options);
      return noacl;
    },
  });

  return zod as ZodAcl<Z, User, Vars>;
}
export const AssignAcl = A;

//// /////////////////////////////////////////////////////////////////////////////

function createPath(path: string, key: string) {
  return `${path === "" ? "" : `${path}.`}${key}`;
}

function findShape<Z extends ZodType>(zod: Z) {
  if (Instanceof(zod, "ZodObject")) {
    return (zod as unknown as ZodObject<any, any>).shape;
    // Todo: handle same way as Optional
  } else if (Instanceof(zod, "ZodEffects")) {
    return (zod as unknown as ZodEffects<any>)._def.schema;
    // Todo: handle same way as Optional
  } else if (Instanceof(zod, "ZodDefault")) {
    return (zod as unknown as ZodDefault<any>)._def.innerType;
  }

  return null;
}

function getDescriptor<Z extends ZodType, D extends Descriptor>(
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

  if (Instanceof(zod, "ZodOptional")) {
    const innerType = (zod as unknown as ZodOptional<any>).unwrap();

    const result = {};
    Object.assign(
      result,
      getDescriptor(innerType as any, path, deep, debug),
      acl
    );
    return result;
  } else if (Instanceof(zod, "ZodIntersection")) {
    const left = (zod as unknown as ZodIntersection<any, any>)._def
      .left as ZodType;
    const right = (zod as unknown as ZodIntersection<any, any>)._def
      .right as ZodType;
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
  } else if (Instanceof(zod, "ZodArray")) {
    const innerType = (zod._def as ZodArrayDef).type;
    const wildcardPath = createPath(path, "*");
    acl[wildcardPath] = innerType.descriptor ?? zod.descriptor;

    const valueDefinition = getDescriptor(innerType, wildcardPath, deep, debug);

    Object.assign(acl, valueDefinition);
  } else if (Instanceof(zod, "ZodRecord")) {
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
  } else if (Instanceof(zod, "ZodUnion")) {
    const optionDescriptors = Object.keys(
      (zod as unknown as ZodUnion<any>)._def.options
    ).map((o) =>
      getDescriptor(
        (zod as unknown as ZodUnion<any>)._def.options[o] as any,
        path,
        deep,
        debug
      )
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
  } else if ((zod?._def as ZodDefaultDef)?.innerType) {
    const def = (zod._def as ZodDefaultDef)
      .innerType as ZodDefaultDef["innerType"];

    if (def.descriptor) {
      acl[path] = def.descriptor;
    }
    return acl;
  }

  return acl;
}
