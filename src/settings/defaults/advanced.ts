/**
 * @file Default settings: advanced
 */
import type { SettingDefinition } from "../types";

export const advancedSettings = [
  {
    key: "advanced.debugMode",
    label: "Debug Mode",
    description: "Enable debug mode with additional logging",
    category: "advanced",
    type: "boolean",
    defaultValue: false,
    order: 1,
  },
  {
    key: "advanced.showPerformanceMetrics",
    label: "Show Performance Metrics",
    description: "Display performance metrics in the UI",
    category: "advanced",
    type: "boolean",
    defaultValue: false,
    order: 2,
  },
  {
    key: "advanced.logLevel",
    label: "Log Level",
    description: "Minimum log level to display",
    category: "advanced",
    type: "select",
    defaultValue: "info",
    options: [
      { value: "debug", label: "Debug" },
      { value: "info", label: "Info" },
      { value: "warn", label: "Warning" },
      { value: "error", label: "Error" },
    ],
    order: 3,
  },
  {
    key: "advanced.experimentalFeatures",
    label: "Experimental Features",
    description: "Enable experimental features (may be unstable)",
    category: "advanced",
    type: "boolean",
    defaultValue: false,
    order: 4,
  },
  {
    key: "advanced.customCSS",
    label: "Custom CSS",
    description: "Custom CSS to apply to the editor",
    category: "advanced",
    type: "textarea",
    defaultValue: "",
    placeholder: "/* Enter custom CSS here */",
    order: 5,
  },
] as const satisfies readonly SettingDefinition[];

