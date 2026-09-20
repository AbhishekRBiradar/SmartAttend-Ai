/**
 * Utility functions for robust Firestore data sanitation and state deduplication.
 */

/**
 * Recursively removes all `undefined` values from an object or nested objects/arrays.
 * Firestore will throw an error if any field in a setDoc/updateDoc/addDoc payload is `undefined`.
 */
export const cleanObject = <T extends Record<string, any>>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => (item && typeof item === 'object' && !(item instanceof Date) ? cleanObject(item) : item)) as any;
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        acc[key] = cleanObject(value);
      } else if (Array.isArray(value)) {
        acc[key] = value
          .filter(item => item !== undefined)
          .map(item => (item && typeof item === 'object' && !(item instanceof Date) ? cleanObject(item) : item));
      } else {
        acc[key] = value;
      }
    }
    return acc;
  }, {} as Record<string, any>) as T;
};

/**
 * Deduplicates an array of Firestore items by their unique identifier.
 * Prevents React duplicate key errors and snapshot sync anomalies.
 */
export const uniqueDocs = <T extends { id?: string }>(docs: T[]): T[] => {
  if (!Array.isArray(docs)) return [];
  const map = new Map<string, T>();
  for (const item of docs) {
    if (!item) continue;
    const key = item.id || (item as any).user_id || (item as any).exam_id || (item as any).code;
    if (key) {
      map.set(key, item);
    } else {
      map.set(JSON.stringify(item), item);
    }
  }
  return Array.from(map.values());
};
