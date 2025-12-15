/**
 * @file Built-in settings categories for SettingsManager.
 */
import type { BuiltInCategories } from "./types";

export const builtInCategories: BuiltInCategories = {
  general: {
    key: "general",
    label: "General",
    description: "General editor settings",
    order: 1,
  },
  appearance: {
    key: "appearance",
    label: "Appearance",
    description: "Visual appearance and theming",
    order: 2,
  },
  behavior: {
    key: "behavior",
    label: "Behavior",
    description: "Editor behavior and interactions",
    order: 3,
  },
  performance: {
    key: "performance",
    label: "Performance",
    description: "Performance and optimization settings",
    order: 4,
  },
  keyboard: {
    key: "keyboard",
    label: "Keyboard",
    description: "Keyboard shortcuts and bindings",
    order: 5,
  },
  plugins: {
    key: "plugins",
    label: "Plugins",
    description: "Plugin management and configuration",
    order: 6,
  },
  advanced: {
    key: "advanced",
    label: "Advanced",
    description: "Advanced settings for power users",
    order: 7,
  },
};
