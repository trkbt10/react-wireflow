/**
 * @file Default settings: plugins
 */
import type { SettingDefinition } from "../types";

export const pluginSettings = [
  {
    key: "plugins.autoUpdate",
    label: "Auto Update Plugins",
    description: "Automatically update plugins when available",
    category: "plugins",
    type: "boolean",
    defaultValue: false,
    order: 1,
  },
  {
    key: "plugins.allowUnsafe",
    label: "Allow Unsafe Plugins",
    description: "Allow loading plugins without security verification",
    category: "plugins",
    type: "boolean",
    defaultValue: false,
    order: 2,
  },
  {
    key: "plugins.maxMemoryUsage",
    label: "Max Memory Usage",
    description: "Maximum memory usage for plugins (MB)",
    category: "plugins",
    type: "number",
    defaultValue: 100,
    min: 10,
    max: 1000,
    order: 3,
  },
] as const satisfies readonly SettingDefinition[];

