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

/**
 * Checks if the given input is an object.
 *
 * @param obj - The input to check.
 * @returns True if the input is an object, false otherwise.
 */
function isObj(obj: any): boolean {
  return !!obj && typeof obj === "object";
}

/**
 * Returns the named type of the input, differentiating between null and undefined.
 *
 * @param obj - The input to get the type of.
 * @returns The name of the type.
 */
function namedType(obj: any): string {
  return obj === null ? "null" : obj === undefined ? "undefined" : typeof obj;
}

/**
 * Retrieves a value from an object at a given path.
 *
 * @typeParam Output - The expected type of the retrieved value.
 * @param obj - The object from which to retrieve the value.
 * @param path - The path within the object, delineated by periods.
 * @returns The value at the specified path, or undefined if the path is not found.
 * @throws If the initial input object is not an object.
 */
export function getValueByPath<Output = unknown>(
  obj: Record<string, any>,
  path: string
): Output | undefined {
  if (!isObj(obj))
    throw new Error(`Invalid obj input of type ${namedType(obj)}`);

  return path.split(".").reduce((current, key) => {
    if (!isObj(current) || !(key in current)) {
      if (key === "") return current;
      return undefined;
    }
    return current[key] as any;
  }, obj as Record<string, any>) as Output | undefined;
}

/**
 * Sets a value in an object at a given path, creating any necessary intermediate
 * objects or arrays along the path.
 *
 * @typeParam Input - The type of the value to set.
 * @param obj - The object to modify.
 * @param path - The path within the object, delineated by periods, where the value should be set.
 * @param value - The value to set.
 * @throws If the initial input object is not an object or if an intermediate path is not an object.
 */
export function setValueByPath<Input = unknown>(
  obj: Record<string, any>,
  path: string,
  value: Input
): void {
  if (!isObj(obj))
    throw new Error(`Invalid obj input of type ${namedType(obj)}`);

  const keys = path.split(".");
  const lastKey = keys.pop()!; // Assert that there is always a last key.
  const lastObj = keys.reduce((current, key, index) => {
    if (!isObj(current)) {
      // If current path segment is not an object, throw an error.
      throw new Error(
        `Invalid obj. At path '${keys
          .slice(0, index)
          .join(".")}' the field is of type '${namedType(
          current
        )}' instead of 'object'.`
      );
    } else if (!(key in current)) {
      // Create a new object or array at the current key based on the next key.
      if (keys[index + 1] && !isNaN(Number(keys[index + 1]))) {
        current[key] = [];
      } else {
        current[key] = {};
      }
    }

    return current[key];
  }, obj);

  if (value === undefined) {
    delete lastObj[lastKey];
  } else {
    lastObj[lastKey] = value;
  }
}

export function parseRegexOrString(input: string | RegExp): string | RegExp {
  if (typeof input === "string") {
    const match = input.match(/^regex#(.+)#([gimuys]*)$/);
    if (match) {
      // Unescape custom delimiter
      const pattern = match[1].replace(/\\#/g, "#");
      return new RegExp(pattern, match[2]);
    }
  }

  return input;
}

export function serializeRegex(input: string | RegExp): string {
  if (typeof input === "string") return input;
  // Escape custom delimiter in the regex source
  const escapedSource = input.source.replace(/#/g, "\\#");

  // Convert the regex to a string and add the prefix with the escaped source
  return `regex#${escapedSource}#${input.flags}`;
}
