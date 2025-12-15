/**
 * @file Default settings: performance
 */
import type { SettingDefinition } from "../types";

export const performanceSettings = [
  {
    key: "performance.maxHistorySteps",
    label: "Max History Steps",
    description: "Maximum number of undo/redo steps",
    category: "performance",
    type: "number",
    defaultValue: 50,
    min: 10,
    max: 200,
    order: 1,
  },
  {
    key: "performance.renderOptimization",
    label: "Render Optimization",
    description: "Enable render optimization techniques",
    category: "performance",
    type: "boolean",
    defaultValue: true,
    order: 2,
  },
  {
    key: "performance.lazyLoading",
    label: "Lazy Loading",
    description: "Load nodes and connections lazily",
    category: "performance",
    type: "boolean",
    defaultValue: true,
    order: 3,
  },
  {
    key: "performance.virtualScrolling",
    label: "Virtual Scrolling",
    description: "Use virtual scrolling for large node lists",
    category: "performance",
    type: "boolean",
    defaultValue: true,
    order: 4,
  },
  {
    key: "performance.maxVisibleNodes",
    label: "Max Visible Nodes",
    description: "Maximum number of nodes to render at once",
    category: "performance",
    type: "number",
    defaultValue: 1000,
    min: 100,
    max: 5000,
    order: 5,
  },
] as const satisfies readonly SettingDefinition[];

