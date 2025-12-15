/**
 * @file Shared settings storage "change" event emitter.
 * This is a tiny adapter helper kept separate to improve reusability and tree-shaking.
 */
import type { SettingValue } from "../types";

export type StorageChangeHandler = (key: string, value: SettingValue) => void;

export type StorageChangeEmitter = {
  on: (handler: StorageChangeHandler) => () => void;
  emit: (key: string, value: SettingValue) => void;
};

export const createStorageChangeEmitter = (): StorageChangeEmitter => {
  const listeners = new Set<StorageChangeHandler>();

  return {
    on: (handler) => {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    },
    emit: (key, value) => {
      for (const handler of listeners) {
        handler(key, value);
      }
    },
  };
};

