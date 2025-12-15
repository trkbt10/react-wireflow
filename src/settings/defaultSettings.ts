/**
 * @file Default settings configuration for the node editor
 */
import type { SettingDefinition } from "./types";
import { advancedSettings } from "./defaults/advanced";
import { appearanceSettings } from "./defaults/appearance";
import { behaviorSettings } from "./defaults/behavior";
import { generalSettings } from "./defaults/general";
import { keyboardSettings } from "./defaults/keyboard";
import { performanceSettings } from "./defaults/performance";
import { pluginSettings } from "./defaults/plugins";

export const defaultSettings = [
  ...generalSettings,
  ...appearanceSettings,
  ...behaviorSettings,
  ...performanceSettings,
  ...keyboardSettings,
  ...pluginSettings,
  ...advancedSettings,
] as const satisfies readonly SettingDefinition[];

