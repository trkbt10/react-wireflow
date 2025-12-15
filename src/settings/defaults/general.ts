/**
 * @file Default settings: general
 */
import type { SettingDefinition } from "../types";

export const generalSettings = [
  {
    key: "general.language",
    label: "Language",
    description: "Interface language",
    category: "general",
    type: "select",
    defaultValue: "en",
    options: [
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
      { value: "zh", label: "中文" },
      { value: "ko", label: "한국어" },
      { value: "es", label: "Español" },
      { value: "fr", label: "Français" },
      { value: "de", label: "Deutsch" },
    ],
    order: 1,
  },
  {
    key: "general.autoSave",
    label: "Auto Save",
    description: "Automatically save changes",
    category: "general",
    type: "boolean",
    defaultValue: true,
    order: 2,
  },
  {
    key: "general.autoSaveInterval",
    label: "Auto Save Interval",
    description: "Auto save interval in seconds",
    category: "general",
    type: "number",
    defaultValue: 30,
    min: 5,
    max: 300,
    dependsOn: "general.autoSave",
    showWhen: (settings) => settings["general.autoSave"] === true,
    order: 3,
  },
  {
    key: "general.confirmBeforeExit",
    label: "Confirm Before Exit",
    description: "Show confirmation dialog before closing",
    category: "general",
    type: "boolean",
    defaultValue: true,
    order: 4,
  },
] as const satisfies readonly SettingDefinition[];

