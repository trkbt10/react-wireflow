/**
 * @file In-memory SettingsStorage adapter.
 * Intended for tests/examples; small, explicit, and tree-shake friendly.
 */
import type { SettingValue, SettingsStorage } from "../types";
import { createStorageChangeEmitter } from "./storageEmitter";

export const createMemorySettingsStorage = (): SettingsStorage => {
  const values = new Map<string, SettingValue>();
  const emitter = createStorageChangeEmitter();

  return {
    get: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value);
      emitter.emit(key, value);
    },
    delete: (key) => {
      values.delete(key);
      emitter.emit(key, "");
    },
    clear: () => {
      values.clear();
    },
    keys: () => [...values.keys()],
    getMany: (keys) => {
      const result: Record<string, SettingValue> = {};
      for (const key of keys) {
        const value = values.get(key);
        if (value !== undefined) {
          result[key] = value;
        }
      }
      return result;
    },
    setMany: (nextValues) => {
      for (const [key, value] of Object.entries(nextValues)) {
        values.set(key, value);
        emitter.emit(key, value);
      }
    },
    on: (event, handler) => {
      if (event !== "change") {
        throw new Error(`Unsupported storage event: ${event}`);
      }
      return emitter.on(handler);
    },
  };
};
