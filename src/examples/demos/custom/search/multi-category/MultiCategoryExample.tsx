/**
 * @file Example demonstrating multi-category node definitions and multi-select in NodeSearchMenu
 */
import * as React from "react";
import type { NodeDefinition } from "../../../../../types/NodeDefinition";
import {
  NodeSearchMenu,
  type NodeSearchMenuViewMode,
} from "../../../../../components/panels/node-search/NodeSearchMenu";
import { I18nProvider } from "../../../../../i18n/context";
import { enMessages } from "../../../../../i18n/en";
import styles from "./MultiCategoryExample.module.css";

/**
 * Sample node definitions demonstrating multi-category support
 */
const multiCategoryNodeDefinitions: NodeDefinition[] = [
  // Single category nodes (traditional)
  {
    type: "data-source",
    displayName: "Data Source",
    description: "Load data from external sources",
    category: "Data",
    icon: "📥",
    priority: 1,
  },
  {
    type: "ui-button",
    displayName: "Button",
    description: "Interactive button component",
    category: "UI",
    icon: "🔘",
    priority: 2,
  },

  // Multi-category nodes - appears in multiple categories
  {
    type: "data-table",
    displayName: "Data Table",
    description: "Display data in a table format (appears in both Data and UI)",
    category: ["Data", "UI"],
    icon: "📊",
    priority: 1,
  },
  {
    type: "chart-widget",
    displayName: "Chart Widget",
    description: "Visualization component (appears in Data, UI, and Visualization)",
    category: ["Data", "UI", "Visualization"],
    icon: "📈",
    priority: 1,
  },

  // Hierarchical multi-category - demonstrates prefix filtering
  {
    type: "custom-control",
    displayName: "Custom Control",
    description: "Appears in custom/ui and custom/form (NOT in custom directly)",
    category: ["custom/ui", "custom/form"],
    icon: "🎛️",
    priority: 3,
  },
  {
    type: "form-input",
    displayName: "Form Input",
    description: "Appears in custom/form and UI/Controls",
    category: ["custom/form", "UI/Controls"],
    icon: "📝",
    priority: 3,
  },

  // Parent + child category (parent should be filtered out)
  {
    type: "advanced-widget",
    displayName: "Advanced Widget",
    description: "Specifies both parent and child - should only appear in child",
    category: ["custom", "custom/advanced"],
    icon: "⚙️",
    priority: 3,
  },

  // Additional nodes for variety
  {
    type: "viz-heatmap",
    displayName: "Heatmap",
    description: "Heatmap visualization",
    category: "Visualization",
    icon: "🔥",
    priority: 4,
  },
  {
    type: "viz-scatter",
    displayName: "Scatter Plot",
    description: "Scatter plot visualization",
    category: "Visualization",
    icon: "⚫",
    priority: 4,
  },
  {
    type: "ui-slider",
    displayName: "Slider",
    description: "Range slider control",
    category: "UI/Controls",
    icon: "🎚️",
    priority: 2,
  },
  {
    type: "ui-toggle",
    displayName: "Toggle",
    description: "On/off toggle switch",
    category: "UI/Controls",
    icon: "🔛",
    priority: 2,
  },
  {
    type: "custom-panel",
    displayName: "Custom Panel",
    description: "Custom panel in UI category",
    category: "custom/ui",
    icon: "📋",
    priority: 3,
  },
  {
    type: "custom-validator",
    displayName: "Form Validator",
    description: "Validation logic for forms",
    category: "custom/form",
    icon: "✅",
    priority: 3,
  },
];

export const MultiCategoryExample: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<NodeSearchMenuViewMode>("split");
  const [menuVisible, setMenuVisible] = React.useState(true);
  const [menuPosition, setMenuPosition] = React.useState({ x: 100, y: 100 });
  const [createdNodes, setCreatedNodes] = React.useState<string[]>([]);

  const handleCreateNode = React.useCallback((nodeType: string) => {
    setCreatedNodes((prev) => [...prev, nodeType]);
    setMenuVisible(false);
  }, []);

  const handleClose = React.useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!menuVisible) {
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setMenuVisible(true);
      }
    },
    [menuVisible],
  );

  const dictionaries = React.useMemo(() => ({ en: enMessages }), []);

  return (
    <I18nProvider dictionaries={dictionaries} initialLocale="en">
      <div className={styles.container}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>View Mode:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as NodeSearchMenuViewMode)}
              className={styles.select}
            >
              <option value="list">List (Classic)</option>
              <option value="split">Split Pane</option>
            </select>
          </div>
          <button type="button" className={styles.button} onClick={() => setMenuVisible(true)}>
            Open Menu
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={() => setCreatedNodes([])}>
            Clear Log
          </button>
        </div>

        <div className={styles.content}>
          <div
            className={styles.canvas}
            onClick={handleCanvasClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setMenuVisible(true);
              }
            }}
          >
            <div className={styles.canvasHint}>
              Click anywhere to open the NodeSearchMenu
              <br />
              <span className={styles.hint}>Use Cmd/Ctrl+Click to multi-select categories</span>
            </div>

            <NodeSearchMenu
              position={menuPosition}
              nodeDefinitions={multiCategoryNodeDefinitions}
              onCreateNode={handleCreateNode}
              onClose={handleClose}
              visible={menuVisible}
              viewMode={viewMode}
            />
          </div>

          <div className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Created Nodes Log</h3>
            <div className={styles.log}>
              {createdNodes.length === 0 ? (
                <div className={styles.emptyLog}>No nodes created yet</div>
              ) : (
                createdNodes.map((nodeType, index) => (
                  <div key={`${nodeType}-${index}`} className={styles.logEntry}>
                    <span className={styles.logIndex}>{index + 1}.</span>
                    <span className={styles.logType}>{nodeType}</span>
                  </div>
                ))
              )}
            </div>

            <div className={styles.info}>
              <h4 className={styles.infoTitle}>Multi-Category Features</h4>
              <p className={styles.infoText}>This example demonstrates:</p>
              <ul className={styles.infoList}>
                <li>
                  <strong>Multi-category nodes:</strong> "Data Table" appears in both Data and UI
                </li>
                <li>
                  <strong>Prefix filtering:</strong> "Custom Control" with ["custom/ui", "custom/form"] does NOT appear
                  in "custom" directly
                </li>
                <li>
                  <strong>Parent+child:</strong> "Advanced Widget" with ["custom", "custom/advanced"] only appears in
                  custom/advanced
                </li>
                <li>
                  <strong>Multi-select:</strong> Cmd/Ctrl+Click to select multiple categories
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </I18nProvider>
  );
};
