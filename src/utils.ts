type BaseType = number | string | boolean;
type GenericObject<T = any> = Record<string, T>;

/**
 * Recursively flattens a nested object with keys as paths to the values.
 *
 * @param {GenericObject} obj - The object to flatten.
 * @param {string} path - The initial path for keys. Used during recursion.
 * @returns {GenericObject<BaseType>} A new object with no nested properties.
 */
export function flatten<Obj extends GenericObject>(
  obj: Obj,
  path = ""
): GenericObject<BaseType> {
  const type = typeof obj;
  if (
    obj === null ||
    obj === undefined ||
    ["string", "number", "boolean"].includes(type)
  )
    throw new TypeError(
      `flatten() Unexpected type '${
        obj === null ? null : obj === undefined ? undefined : type
      }' for input.`
    );

  // Retrieve the keys of the object
  const keys = Object.keys(obj);

  // Initialize the result object
  const result: GenericObject<BaseType> = {};

  for (let key of keys) {
    // Changed 'in' to 'of' to correctly iterate over keys
    // Construct the new key based on the path
    const navigatePath = path.length ? `${path}.${key}` : key;

    // Check if the value is an object and not null
    if (typeof obj[key] === "object" && obj[key] !== null) {
      // Recursively flatten the nested object
      Object.assign(result, flatten(obj[key] as any, navigatePath));
    } else {
      // Assign the value to the navigatePath in the result object
      result[navigatePath] = obj[key];
    }
  }

  return result;
}
