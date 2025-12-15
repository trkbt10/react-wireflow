/**
 * @file LocalStorage-backed SettingsStorage adapter.
 * Kept as a factory function to stay lightweight and tree-shake friendly.
 */
import type { SettingValue, SettingsStorage } from "../types";
import { createStorageChangeEmitter } from "./storageEmitter";

export const createLocalSettingsStorage = (prefix = "node-editor-settings"): SettingsStorage => {
  const emitter = createStorageChangeEmitter();

  const getStorageKey = (key: string): string => `${prefix}-${key}`;

  return {
    get: (key) => {
      try {
        const value = localStorage.getItem(getStorageKey(key));
        return value ? JSON.parse(value) : undefined;
      } catch {
        return undefined;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(getStorageKey(key), JSON.stringify(value));
        emitter.emit(key, value);
      } catch (error) {
        console.warn(`Failed to save setting ${key}:`, error);
      }
    },
    delete: (key) => {
      localStorage.removeItem(getStorageKey(key));
      emitter.emit(key, "");
    },
    clear: () => {
      const keys: string[] = [];
      const prefixKey = `${prefix}-`;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixKey)) {
          keys.push(key.substring(prefixKey.length));
        }
      }
      for (const key of keys) {
        localStorage.removeItem(getStorageKey(key));
      }
    },
    keys: () => {
      const keys: string[] = [];
      const prefixKey = `${prefix}-`;

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixKey)) {
          keys.push(key.substring(prefixKey.length));
        }
      }

      return keys;
    },
    getMany: (keys) => {
      const result: Record<string, SettingValue> = {};
      for (const key of keys) {
        const value = (() => {
          try {
            const raw = localStorage.getItem(getStorageKey(key));
            return raw ? (JSON.parse(raw) as SettingValue) : undefined;
          } catch {
            return undefined;
          }
        })();
        if (value !== undefined) {
          result[key] = value;
        }
      }
      return result;
    },
    setMany: (values) => {
      for (const [key, value] of Object.entries(values)) {
        try {
          localStorage.setItem(getStorageKey(key), JSON.stringify(value));
          emitter.emit(key, value);
        } catch (error) {
          console.warn(`Failed to save setting ${key}:`, error);
        }
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
