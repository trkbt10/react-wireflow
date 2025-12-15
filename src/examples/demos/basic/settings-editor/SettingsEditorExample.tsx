/**
 * @file Settings Editor Example
 * @description Demonstrates how to use SettingsManager to configure editor behavior
 */
import * as React from "react";
import { NodeEditor, SettingsManager, createNodeDefinition } from "../../../../core";
import type { EditorSettingKey, SettingValue } from "../../../../settings/types";
import type { NodeEditorData } from "../../../../types/core";
import { PropertySection } from "../../../../components/inspector/parts/PropertySection";
import { InspectorFieldRow } from "../../../../components/inspector/parts/InspectorFieldRow";
import { InspectorInput } from "../../../../components/inspector/parts/InspectorInput";
import { InspectorSelect } from "../../../../components/inspector/parts/InspectorSelect";
import { InspectorButton } from "../../../../components/inspector/parts/InspectorButton";
import { InspectorButtonGroup } from "../../../../components/inspector/parts/InspectorButtonGroup";
import { InspectorSectionTitle } from "../../../../components/inspector/parts/InspectorSectionTitle";
import styles from "./SettingsEditorExample.module.css";

const sampleNodeDefinitions = [
  createNodeDefinition({
    type: "input",
    displayName: "Input",
    category: "Basic",
    defaultSize: { width: 180, height: 80 },
    ports: [{ id: "out", type: "output", label: "Output", position: "right" }],
  }),
  createNodeDefinition({
    type: "process",
    displayName: "Process",
    category: "Basic",
    defaultSize: { width: 200, height: 100 },
    ports: [
      { id: "in", type: "input", label: "Input", position: "left" },
      { id: "out", type: "output", label: "Output", position: "right" },
    ],
  }),
  createNodeDefinition({
    type: "output",
    displayName: "Output",
    category: "Basic",
    defaultSize: { width: 180, height: 80 },
    ports: [{ id: "in", type: "input", label: "Input", position: "left" }],
  }),
];

const initialData: NodeEditorData = {
  nodes: {
    "node-1": {
      id: "node-1",
      type: "input",
      position: { x: 100, y: 150 },
      data: { title: "Input Node" },
    },
    "node-2": {
      id: "node-2",
      type: "process",
      position: { x: 350, y: 130 },
      data: { title: "Process Node" },
    },
    "node-3": {
      id: "node-3",
      type: "output",
      position: { x: 620, y: 150 },
      data: { title: "Output Node" },
    },
  },
  connections: {
    "conn-1": {
      id: "conn-1",
      fromNodeId: "node-1",
      fromPortId: "out",
      toNodeId: "node-2",
      toPortId: "in",
    },
    "conn-2": {
      id: "conn-2",
      fromNodeId: "node-2",
      fromPortId: "out",
      toNodeId: "node-3",
      toPortId: "in",
    },
  },
};

const booleanOptions = [
  { value: "true", label: "On" },
  { value: "false", label: "Off" },
];

export const SettingsEditorExample: React.FC = () => {
  const settingsManager = React.useMemo(() => new SettingsManager(), []);

  // Local state for UI updates
  const [, setUpdateCounter] = React.useState(0);

  // Subscribe to settings changes
  React.useEffect(() => {
    const unsubscribe = settingsManager.on("change", () => {
      setUpdateCounter((c) => c + 1);
    });
    return unsubscribe;
  }, [settingsManager]);

  const getValue = (key: EditorSettingKey): SettingValue | undefined => {
    return settingsManager.getValue(key);
  };

  const getBoolean = (key: EditorSettingKey, fallback: boolean): boolean => {
    const value = getValue(key);
    if (typeof value === "boolean") {
      return value;
    }
    return fallback;
  };

  const getNumber = (key: EditorSettingKey, fallback: number): number => {
    const value = getValue(key);
    if (typeof value === "number") {
      return value;
    }
    return fallback;
  };

  const getTheme = (key: EditorSettingKey, fallback: "light" | "dark" | "auto"): "light" | "dark" | "auto" => {
    const value = getValue(key);
    if (value === "light" || value === "dark" || value === "auto") {
      return value;
    }
    return fallback;
  };

  const getNodeSearchViewMode = (key: EditorSettingKey, fallback: "list" | "split"): "list" | "split" => {
    const value = getValue(key);
    if (value === "list" || value === "split") {
      return value;
    }
    return fallback;
  };

  const getNodeSearchFilterMode = (
    key: EditorSettingKey,
    fallback: "filter" | "highlight",
  ): "filter" | "highlight" => {
    const value = getValue(key);
    if (value === "filter" || value === "highlight") {
      return value;
    }
    return fallback;
  };

  // Appearance settings
  const theme = getTheme("appearance.theme", "light");
  const showGrid = getBoolean("appearance.showGrid", true);
  const gridSize = getNumber("appearance.gridSize", 20);
  const gridOpacity = getNumber("appearance.gridOpacity", 0.3);
  const showMinimap = getBoolean("appearance.showMinimap", true);
  const showStatusBar = getBoolean("appearance.showStatusBar", true);

  // Behavior settings
  const smoothAnimations = getBoolean("behavior.smoothAnimations", true);
  const doubleClickToEdit = getBoolean("behavior.doubleClickToEdit", true);
  const nodeSearchViewMode = getNodeSearchViewMode("behavior.nodeSearchViewMode", "list");
  const nodeSearchFilterMode = getNodeSearchFilterMode("behavior.nodeSearchFilterMode", "filter");
  const nodeSearchMenuWidth = getNumber("behavior.nodeSearchMenuWidth", 360);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <InspectorSectionTitle>Settings</InspectorSectionTitle>
        </div>

        <div className={styles.sidebarContent}>
          <PropertySection title="Appearance">
            <InspectorFieldRow label="Theme">
              <InspectorSelect
                value={theme}
                onChange={(e) =>
                  settingsManager.setValue("appearance.theme", e.target.value as "light" | "dark" | "auto")
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </InspectorSelect>
            </InspectorFieldRow>

            <InspectorFieldRow label="Show Grid">
              <InspectorButtonGroup
                options={booleanOptions}
                value={String(showGrid)}
                onChange={(v) => settingsManager.setValue("appearance.showGrid", v === "true")}
                aria-label="Show grid"
              />
            </InspectorFieldRow>

            <InspectorFieldRow label="Grid Size">
              <InspectorInput
                type="number"
                min={10}
                max={50}
                value={gridSize}
                onChange={(e) => settingsManager.setValue("appearance.gridSize", Number(e.target.value))}
              />
            </InspectorFieldRow>

            <InspectorFieldRow label="Grid Opacity">
              <InspectorInput
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={gridOpacity}
                onChange={(e) => settingsManager.setValue("appearance.gridOpacity", Number(e.target.value))}
              />
            </InspectorFieldRow>

            <InspectorFieldRow label="Show Minimap">
              <InspectorButtonGroup
                options={booleanOptions}
                value={String(showMinimap)}
                onChange={(v) => settingsManager.setValue("appearance.showMinimap", v === "true")}
                aria-label="Show minimap"
              />
            </InspectorFieldRow>

            <InspectorFieldRow label="Show Status Bar">
              <InspectorButtonGroup
                options={booleanOptions}
                value={String(showStatusBar)}
                onChange={(v) => settingsManager.setValue("appearance.showStatusBar", v === "true")}
                aria-label="Show status bar"
              />
            </InspectorFieldRow>
          </PropertySection>

          <PropertySection title="Behavior">
            <InspectorFieldRow label="Smooth Animations">
              <InspectorButtonGroup
                options={booleanOptions}
                value={String(smoothAnimations)}
                onChange={(v) => settingsManager.setValue("behavior.smoothAnimations", v === "true")}
                aria-label="Smooth animations"
              />
            </InspectorFieldRow>

            <InspectorFieldRow label="Double-click Edit">
              <InspectorButtonGroup
                options={booleanOptions}
                value={String(doubleClickToEdit)}
                onChange={(v) => settingsManager.setValue("behavior.doubleClickToEdit", v === "true")}
                aria-label="Double-click to edit"
              />
            </InspectorFieldRow>

            <InspectorFieldRow label="Search View">
              <InspectorSelect
                value={nodeSearchViewMode}
                onChange={(e) =>
                  settingsManager.setValue("behavior.nodeSearchViewMode", e.target.value as "list" | "split")
                }
              >
                <option value="list">List</option>
                <option value="split">Split Pane</option>
              </InspectorSelect>
            </InspectorFieldRow>

            <InspectorFieldRow label="Filter Mode">
              <InspectorSelect
                value={nodeSearchFilterMode}
                onChange={(e) =>
                  settingsManager.setValue("behavior.nodeSearchFilterMode", e.target.value as "filter" | "highlight")
                }
              >
                <option value="filter">Filter</option>
                <option value="highlight">Highlight</option>
              </InspectorSelect>
            </InspectorFieldRow>

            <InspectorFieldRow label="Menu Width">
              <InspectorInput
                type="number"
                min={280}
                max={600}
                value={nodeSearchMenuWidth}
                onChange={(e) => settingsManager.setValue("behavior.nodeSearchMenuWidth", Number(e.target.value))}
              />
            </InspectorFieldRow>
          </PropertySection>
        </div>

        <div className={styles.sidebarFooter}>
          <InspectorButton
            variant="secondary"
            onClick={() => {
              settingsManager.resetToDefaults();
            }}
          >
            Reset to Defaults
          </InspectorButton>
        </div>
      </div>

      <div className={styles.editorArea}>
        <NodeEditor
          initialData={initialData}
          nodeDefinitions={sampleNodeDefinitions}
          includeDefaultDefinitions={false}
          settingsManager={settingsManager}
        />
      </div>
    </div>
  );
};
