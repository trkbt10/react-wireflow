/**
 * @file Configurable Settings System for Node Editor
 * This system provides a flexible way to manage editor settings,
 * user preferences, and configuration options.
 */

import type { Locale } from "../i18n/types";

/**
 * Setting value types
 */
export type SettingValue = string | number | boolean | string[] | number[] | Record<string, unknown>;

/**
 * Setting input types for UI generation
 */
export type SettingInputType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "color"
  | "range"
  | "textarea"
  | "file"
  | "date"
  | "time"
  | "datetime"
  | "url"
  | "email"
  | "password"
  | "json"
  | "custom";

/**
 * Setting definition
 */
export type SettingDefinition = {
  key: string;
  label: string;
  description?: string;
  category: string;
  type: SettingInputType;
  defaultValue: SettingValue;

  // Validation
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validator?: (value: SettingValue) => string | null;

  // UI configuration
  placeholder?: string;
  options?: Array<{ value: SettingValue; label: string; description?: string }>;
  step?: number;
  disabled?: boolean;
  hidden?: boolean;
  order?: number;

  // Dependencies
  dependsOn?: string; // Other setting key
  showWhen?: (settings: SettingsValues) => boolean;

  // Custom rendering
  customComponent?: React.ComponentType<SettingInputProps>;

  // Restart requirement
  requiresRestart?: boolean;

  // Storage
  persistent?: boolean; // Should be saved to localStorage/storage
};

/**
 * Setting input component props
 */
export type SettingInputProps = {
  setting: SettingDefinition;
  value: SettingValue;
  onChange: (value: SettingValue) => void;
  error?: string;
  disabled?: boolean;
};

/**
 * Setting category definition
 */
export type SettingCategory = {
  key: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  order?: number;
};

/**
 * Settings values object
 */
export type SettingsValues = Record<string, SettingValue>;

/**
 * Settings change event
 */
export type SettingsChangeEvent = {
  key: string;
  value: SettingValue;
  previousValue: SettingValue;
  category: string;
};

/**
 * Settings validation result
 */
export type SettingsValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
};

/**
 * Settings manager interface
 */
export type SettingsManager = {
  // Setting definitions
  registerSetting: (setting: SettingDefinition) => void;
  registerSettings: (settings: SettingDefinition[]) => void;
  unregisterSetting: (key: string) => void;
  getSetting: (key: string) => SettingDefinition | undefined;
  getAllSettings: () => Record<string, SettingDefinition>;
  getSettingsByCategory: (category: string) => SettingDefinition[];

  // Categories
  registerCategory: (category: SettingCategory) => void;
  unregisterCategory: (key: string) => void;
  getCategory: (key: string) => SettingCategory | undefined;
  getAllCategories: () => SettingCategory[];

  // Values - type-safe overloads for EditorSettings keys
  getValue: {
    <K extends EditorSettingKey>(key: K): EditorSettings[K] | undefined;
    <T = SettingValue>(key: string): T | undefined;
  };
  setValue: {
    <K extends EditorSettingKey>(key: K, value: EditorSettings[K]): void;
    (key: string, value: SettingValue): void;
  };
  setValues: {
    (values: Partial<EditorSettings>): void;
    (values: Partial<SettingsValues>): void;
  };
  getAllValues: () => SettingsValues;
  resetToDefaults: (keys?: string[]) => void;

  // Validation
  validateSetting: (key: string, value: SettingValue) => string | null;
  validateAll: () => SettingsValidationResult;

  // Persistence
  save: () => Promise<void>;
  load: () => Promise<void>;
  export: () => string;
  import: (data: string) => void;

  // Events
  on: (
    event: "change" | "validate" | "save" | "load",
    handler: (data: SettingsChangeEvent | SettingsValidationResult | SettingsValues) => void,
  ) => () => void;
  emit: (event: string, data: unknown) => void;

  // Utilities
  getSchema: () => Record<string, unknown>; // JSON Schema for the settings
  reset: () => void;
};

/**
 * Built-in setting categories
 */
export type BuiltInCategories = {
  general: SettingCategory;
  appearance: SettingCategory;
  behavior: SettingCategory;
  performance: SettingCategory;
  keyboard: SettingCategory;
  plugins: SettingCategory;
  advanced: SettingCategory;
};

/**
 * Editor-specific settings with type-safe keys
 * Keys match those defined in defaultSettings.ts
 */
export type EditorSettings = {
  // General
  "general.language": Locale;
  "general.autoSave": boolean;
  "general.autoSaveInterval": number;
  "general.confirmBeforeExit": boolean;

  // Appearance
  "appearance.theme": "light" | "dark" | "auto";
  "appearance.fontSize": number;
  "appearance.fontFamily": string;
  "appearance.showGrid": boolean;
  "appearance.gridSize": number;
  "appearance.gridOpacity": number;
  "appearance.snapToGrid": boolean;
  "appearance.showMinimap": boolean;
  "appearance.showStatusBar": boolean;
  "appearance.showToolbar": boolean;
  "appearance.canvasBackground": string;

  // Behavior
  "behavior.doubleClickToEdit": boolean;
  "behavior.autoConnect": boolean;
  "behavior.smoothAnimations": boolean;
  "behavior.dragThreshold": number;
  "behavior.connectionStyle": "straight" | "curved" | "orthogonal";
  "behavior.connectionControlPointRounding": "snap-90" | "horizontal" | "vertical" | "vector" | "port-side";
  "behavior.selectionMode": "click" | "drag";
  "behavior.wheelZoomSensitivity": number;
  "behavior.nodeSearchViewMode": "list" | "split";
  "behavior.nodeSearchFilterMode": "filter" | "highlight";
  "behavior.nodeSearchMenuWidth": number;

  // Performance
  "performance.maxHistorySteps": number;
  "performance.renderOptimization": boolean;
  "performance.lazyLoading": boolean;
  "performance.virtualScrolling": boolean;
  "performance.maxVisibleNodes": number;

  // Keyboard Shortcuts
  "keyboard.undo": string;
  "keyboard.redo": string;
  "keyboard.selectAll": string;
  "keyboard.delete": string;
  "keyboard.copy": string;
  "keyboard.paste": string;
  "keyboard.duplicate": string;
  "keyboard.group": string;
  "keyboard.save": string;

  // Plugins
  "plugins.autoUpdate": boolean;
  "plugins.allowUnsafe": boolean;
  "plugins.maxMemoryUsage": number;

  // Advanced
  "advanced.debugMode": boolean;
  "advanced.showPerformanceMetrics": boolean;
  "advanced.logLevel": "debug" | "info" | "warn" | "error";
  "advanced.experimentalFeatures": boolean;
  "advanced.customCSS": string;
};

/**
 * Type-safe setting key
 */
export type EditorSettingKey = keyof EditorSettings;

/**
 * Settings preset
 */
export type SettingsPreset = {
  name: string;
  description: string;
  author?: string;
  version?: string;
  settings: Partial<SettingsValues>;
  categories?: string[]; // Which categories this preset affects
};

/**
 * Settings import/export format
 */
export type SettingsExport = {
  version: string;
  timestamp: string;
  settings: SettingsValues;
  metadata?: {
    editorVersion?: string;
    platform?: string;
    presets?: SettingsPreset[];
  };
};

/**
 * Settings storage interface
 */
export type SettingsStorage = {
  get: (key: string) => SettingValue | undefined;
  set: (key: string, value: SettingValue) => void;
  delete: (key: string) => void;
  clear: () => void;
  keys: () => string[];

  // Batch operations
  getMany: (keys: string[]) => Record<string, SettingValue>;
  setMany: (values: Record<string, SettingValue>) => void;

  // Events
  on: (event: "change", handler: (key: string, value: SettingValue) => void) => () => void;
};

/**
 * Settings UI configuration
 */
export type SettingsUIConfig = {
  title?: string;
  searchable?: boolean;
  showCategories?: boolean;
  showDescriptions?: boolean;
  showDefaults?: boolean;
  compactMode?: boolean;
  allowImportExport?: boolean;
  allowPresets?: boolean;
  allowReset?: boolean;
};

/**
 * Settings panel component props
 */
export type SettingsPanelProps = {
  settingsManager: SettingsManager;
  config?: SettingsUIConfig;
  onClose?: () => void;
  onSettingChange?: (event: SettingsChangeEvent) => void;
};
