type BaseType = number | string | boolean;
type GenericObject<T = any> = Record<string, T>;

export function flatten<Obj extends GenericObject>(obj: Obj, path = "") {
  const keys = Object.keys(obj);

  const result: GenericObject<BaseType> = {};

  for (let key in keys) {
    const newKey = path.length ? `${path}.${key}` : key;

    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(result, flatten(obj[key]), newKey);
    } else {
      result[newKey] = obj[key];
    }
  }

  return result;
}
