import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Flattens nested metadata objects into a single-level object with dot notation keys.
 * Also merges in any extra fields (e.g., index).
 */
export function flattenMetadata(
  metadata: Record<string, any>,
  extra: Record<string, any> = {}
): Record<string, any> {
  const result: Record<string, any> = { ...extra };

  function recurse(obj: Record<string, any>, parentKey = "") {
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        recurse(value, newKey);
      } else {
        result[newKey] = value;
      }
    }
  }

  recurse(metadata);
  return result;
}
