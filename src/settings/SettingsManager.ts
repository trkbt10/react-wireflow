/**
 * @file Settings manager implementation
 */
import type {
  SettingsManager as ISettingsManager,
  SettingDefinition,
  SettingCategory,
  SettingsValues,
  SettingValue,
  SettingsChangeEvent,
  SettingsValidationResult,
  SettingsStorage,
  EditorSettings,
  EditorSettingKey,
} from "./types";
import { defaultSettings } from "./defaultSettings";
import { builtInCategories } from "./builtInCategories";
import { createLocalSettingsStorage } from "./storages/LocalSettingsStorage";

export { createLocalSettingsStorage } from "./storages/LocalSettingsStorage";
export { createMemorySettingsStorage } from "./storages/MemorySettingsStorage";

/**
 * Event emitter for settings
 */
class SettingsEventEmitter {
  private listeners = new Map<string, ((data: unknown) => void)[]>();

  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);

    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in settings event handler for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

/**
 * Settings Manager constructor options
 */
export type SettingsManagerOptions = {
  storage?: SettingsStorage;
  /** Additional settings to register (merged with defaultSettings) */
  additionalSettings?: SettingDefinition[];
  /** Skip registering defaultSettings (default: false) */
  skipDefaultSettings?: boolean;
};

/**
 * Settings Manager implementation
 */
export class SettingsManager extends SettingsEventEmitter implements ISettingsManager {
  private settings = new Map<string, SettingDefinition>();
  private categories = new Map<string, SettingCategory>();
  private values = new Map<string, SettingValue>();
  private storage: SettingsStorage;

  constructor(options?: SettingsManagerOptions) {
    super();
    this.storage = options?.storage ?? createLocalSettingsStorage();

    // Register built-in categories
    Object.values(builtInCategories).forEach((category) => {
      this.registerCategory(category);
    });

    // Register default settings unless skipped
    if (!options?.skipDefaultSettings) {
      this.registerSettings(defaultSettings);
    }

    // Register additional settings if provided
    if (options?.additionalSettings) {
      this.registerSettings(options.additionalSettings);
    }

    // Load values from storage
    this.loadFromStorage();
  }

  // Setting definitions
  registerSetting(setting: SettingDefinition): void {
    // Validate setting
    if (!setting.key) {
      throw new Error("Setting key is required");
    }

    if (!setting.category) {
      throw new Error("Setting category is required");
    }

    // Ensure category exists
    if (!this.categories.has(setting.category)) {
      this.registerCategory({
        key: setting.category,
        label: setting.category.charAt(0).toUpperCase() + setting.category.slice(1),
      });
    }

    this.settings.set(setting.key, setting);

    // Set default value if not already set
    if (!this.values.has(setting.key)) {
      this.values.set(setting.key, setting.defaultValue);
    }

    this.emit("setting-registered", { setting });
  }

  registerSettings(settings: SettingDefinition[]): void {
    settings.forEach((setting) => this.registerSetting(setting));
  }

  unregisterSetting(key: string): void {
    this.settings.delete(key);
    this.values.delete(key);
    this.emit("setting-unregistered", { key });
  }

  getSetting(key: string): SettingDefinition | undefined {
    return this.settings.get(key);
  }

  getAllSettings(): Record<string, SettingDefinition> {
    return Object.fromEntries(this.settings);
  }

  getSettingsByCategory(category: string): SettingDefinition[] {
    return Array.from(this.settings.values())
      .filter((setting) => setting.category === category)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // Categories
  registerCategory(category: SettingCategory): void {
    this.categories.set(category.key, category);
    this.emit("category-registered", { category });
  }

  unregisterCategory(key: string): void {
    this.categories.delete(key);
    this.emit("category-unregistered", { key });
  }

  getCategory(key: string): SettingCategory | undefined {
    return this.categories.get(key);
  }

  getAllCategories(): SettingCategory[] {
    return Array.from(this.categories.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // Values - type-safe overloads
  getValue<K extends EditorSettingKey>(key: K): EditorSettings[K] | undefined;
  getValue<T = SettingValue>(key: string): T | undefined;
  getValue(key: string): SettingValue | undefined {
    return this.values.get(key);
  }

  setValue<K extends EditorSettingKey>(key: K, value: EditorSettings[K]): void;
  setValue(key: string, value: SettingValue): void;
  setValue(key: string, value: SettingValue): void {
    const setting = this.settings.get(key);
    if (!setting) {
      console.warn(`Setting ${key} is not registered`);
      return;
    }

    // Validate value
    const error = this.validateSetting(key, value);
    if (error) {
      throw new Error(`Invalid value for setting ${key}: ${error}`);
    }

    const previousValue = this.values.get(key);
    this.values.set(key, value);

    // Save to storage if persistent
    if (setting.persistent !== false) {
      this.storage.set(key, value);
    }

    // Emit change event
    const event: SettingsChangeEvent = {
      key,
      value,
      previousValue: previousValue!,
      category: setting.category,
    };

    this.emit("change", event);
  }

  setValues(values: Partial<EditorSettings>): void;
  setValues(values: Partial<SettingsValues>): void;
  setValues(values: Partial<SettingsValues>): void {
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        this.setValue(key, value);
      }
    });
  }

  getAllValues(): SettingsValues {
    return Object.fromEntries(this.values);
  }

  resetToDefaults(keys?: string[]): void {
    const keysToReset = keys || Array.from(this.settings.keys());

    keysToReset.forEach((key) => {
      const setting = this.settings.get(key);
      if (setting) {
        this.setValue(key, setting.defaultValue);
      }
    });

    this.emit("reset", { keys: keysToReset });
  }

  // Validation
  validateSetting(key: string, value: SettingValue): string | null {
    const setting = this.settings.get(key);
    if (!setting) {
      return "Setting not found";
    }

    // Required check
    if (setting.required && (value === undefined || value === null || value === "")) {
      return "This setting is required";
    }

    // Type-specific validation
    if (value !== undefined && value !== null) {
      switch (setting.type) {
        case "number":
        case "range":
          if (typeof value !== "number") {
            return "Value must be a number";
          }
          if (setting.min !== undefined && value < setting.min) {
            return `Value must be at least ${setting.min}`;
          }
          if (setting.max !== undefined && value > setting.max) {
            return `Value must be at most ${setting.max}`;
          }
          break;

        case "text":
        case "textarea":
        case "email":
        case "url":
        case "password":
          if (typeof value !== "string") {
            return "Value must be a string";
          }
          if (setting.minLength !== undefined && value.length < setting.minLength) {
            return `Value must be at least ${setting.minLength} characters long`;
          }
          if (setting.maxLength !== undefined && value.length > setting.maxLength) {
            return `Value must be at most ${setting.maxLength} characters long`;
          }
          if (setting.pattern && !new RegExp(setting.pattern).test(value)) {
            return "Value does not match required pattern";
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            return "Value must be a boolean";
          }
          break;

        case "select":
          if (setting.options) {
            const validValues = setting.options.map((opt) => opt.value);
            if (!validValues.includes(value)) {
              return "Value must be one of the valid options";
            }
          }
          break;

        case "multiselect":
          if (!Array.isArray(value)) {
            return "Value must be an array";
          }
          if (setting.options) {
            const validValues = setting.options.map((opt) => opt.value);
            for (const item of value) {
              if (!validValues.includes(item)) {
                return "All values must be valid options";
              }
            }
          }
          break;
      }
    }

    // Custom validator
    if (setting.validator) {
      return setting.validator(value);
    }

    return null;
  }

  validateAll(): SettingsValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    this.settings.forEach((_setting, key) => {
      const value = this.values.get(key);
      const error = this.validateSetting(key, value!);

      if (error) {
        errors[key] = error;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  // Persistence
  async save(): Promise<void> {
    try {
      this.settings.forEach((setting, key) => {
        if (setting.persistent !== false) {
          const value = this.values.get(key);
          if (value !== undefined) {
            this.storage.set(key, value);
          }
        }
      });

      this.emit("save", { timestamp: new Date().toISOString() });
    } catch (error) {
      this.emit("save-error", { error });
      throw error;
    }
  }

  async load(): Promise<void> {
    try {
      this.loadFromStorage();
      this.emit("load", { timestamp: new Date().toISOString() });
    } catch (error) {
      this.emit("load-error", { error });
      throw error;
    }
  }

  export(): string {
    const exportData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      settings: this.getAllValues(),
      metadata: {
        editorVersion: "1.0.0",
        platform: typeof window !== "undefined" ? navigator.platform : "unknown",
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  import(data: string): void {
    try {
      const imported = JSON.parse(data);

      if (!imported.settings) {
        throw new Error("Invalid settings data");
      }

      this.setValues(imported.settings);
      this.emit("import", { data: imported });
    } catch (error) {
      this.emit("import-error", { error });
      throw error;
    }
  }

  // Utilities
  getSchema(): Record<string, unknown> {
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    this.settings.forEach((setting, key) => {
      const propertySchema: Record<string, unknown> = {
        title: setting.label,
        description: setting.description,
        default: setting.defaultValue,
      };

      switch (setting.type) {
        case "text":
        case "textarea":
        case "email":
        case "url":
        case "password":
          propertySchema.type = "string";
          if (setting.minLength) {
            propertySchema.minLength = setting.minLength;
          }
          if (setting.maxLength) {
            propertySchema.maxLength = setting.maxLength;
          }
          if (setting.pattern) {
            propertySchema.pattern = setting.pattern;
          }
          break;

        case "number":
        case "range":
          propertySchema.type = "number";
          if (setting.min !== undefined) {
            propertySchema.minimum = setting.min;
          }
          if (setting.max !== undefined) {
            propertySchema.maximum = setting.max;
          }
          break;

        case "boolean":
          propertySchema.type = "boolean";
          break;

        case "select":
          propertySchema.type = "string";
          if (setting.options) {
            propertySchema.enum = setting.options.map((opt) => opt.value);
          }
          break;

        case "multiselect":
          propertySchema.type = "array";
          if (setting.options) {
            propertySchema.items = {
              type: "string",
              enum: setting.options.map((opt) => opt.value),
            };
          }
          break;

        default:
          propertySchema.type = "string";
      }

      properties[key] = propertySchema;

      if (setting.required) {
        required.push(key);
      }
    });

    return {
      type: "object",
      properties,
      required,
    };
  }

  // Override the on method to match interface signature
  on(
    event: "change" | "validate" | "save" | "load",
    handler: (data: SettingsChangeEvent | SettingsValidationResult | SettingsValues) => void,
  ): () => void {
    return super.on(event, (data: unknown) => {
      handler(data as SettingsChangeEvent | SettingsValidationResult | SettingsValues);
    });
  }

  reset(): void {
    this.settings.clear();
    this.categories.clear();
    this.values.clear();
    this.storage.clear();

    // Re-register built-in categories
    Object.values(builtInCategories).forEach((category) => {
      this.registerCategory(category);
    });

    this.emit("reset-all", {});
  }

  private loadFromStorage(): void {
    this.settings.forEach((setting, key) => {
      if (setting.persistent !== false) {
        const storedValue = this.storage.get(key);
        if (storedValue !== undefined) {
          this.values.set(key, storedValue);
        } else {
          this.values.set(key, setting.defaultValue);
        }
      } else {
        this.values.set(key, setting.defaultValue);
      }
    });
  }
}
