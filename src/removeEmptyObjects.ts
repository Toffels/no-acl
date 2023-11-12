import { isObj } from "./utils";

// Checks if the given object is empty.
// An object is considered empty if it has no enumerable own properties.
export function isEmptyObject(obj: object): boolean {
  return isObj(obj) && Object.keys(obj).length === 0 && !Array.isArray(obj);
}

// Recursively removes empty objects from a nested object structure.
// - O extends Record<string, any> means that the function accepts any object type.
export function removeEmptyObjects<O extends Record<string, any>>(obj: O): O {
  // If the given value is not an object, return it as is.
  if (!isObj(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    const result: any[] = [];
    if (obj.length === 0) return result as unknown as O;

    for (let i = 0; i < obj.length; i++) {
      const value = obj[i];

      // If the value is an object, check if it's not empty.
      if (isObj(value)) {
        // If the object is not empty, recursively call removeEmptyObjects
        // and assign the result to the current key in the result object.
        if (!isEmptyObject(value)) {
          result[i] = removeEmptyObjects(value);
        }
      } else {
        // If the value is not an object, directly assign it to the result object.
        result[i] = value;
      }
    }

    return result as unknown as O;
  } else {
    // Initialize a result object to store the non-empty properties.
    const result: Record<string, any> = {};
    const keys = Object.keys(obj);

    // Iterate over each key in the object.
    for (const key of keys) {
      const value = obj[key];

      // If the value is an object, check if it's not empty.
      if (isObj(value)) {
        // If the object is not empty, recursively call removeEmptyObjects
        // and assign the result to the current key in the result object.
        if (!isEmptyObject(value)) {
          result[key] = removeEmptyObjects(value);
        }
      } else {
        // If the value is not an object, directly assign it to the result object.
        result[key] = value;
      }
    }

    // Return the result object with empty objects removed.
    // The 'as O' cast ensures the return type matches the input type.
    return result as O;
  }
}
