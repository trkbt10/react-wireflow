/**
 * @file Example showcasing connection behavior customization (rounding + path override).
 */
import * as React from "react";
import { NodeEditorCore, createNodeDefinition, type NodeEditorData } from "../../../../../core";
import { NodeCanvas } from "../../../../../components/canvas/NodeCanvas";
import { SettingsManager } from "../../../../../settings/SettingsManager";
import type { SettingValue, SettingsStorage } from "../../../../../settings/types";
import type { ConnectionBehavior, ConnectionControlPointRoundingId } from "../../../../../types/connectionBehavior";
import { InspectorButtonGroup, InspectorFieldRow, InspectorSection } from "../../../../../inspector";
import { ExampleLayout } from "../../../shared/parts/ExampleLayout";
import { ExampleWrapper } from "../../../shared/parts/ExampleWrapper";
import {
  TwoSideLayout,
  TwoSideLayoutCanvasFrame,
  TwoSideLayoutMain,
  TwoSideLayoutSidebar,
  TwoSideLayoutStack,
} from "../../../../layouts/TwoSideLayout";
import styles from "./ConnectionBehaviorExample.module.css";

class MemorySettingsStorage implements SettingsStorage {
  private values = new Map<string, SettingValue>();
  private listeners = new Set<(key: string, value: SettingValue) => void>();

  get(key: string): SettingValue | undefined {
    return this.values.get(key);
  }

  set(key: string, value: SettingValue): void {
    this.values.set(key, value);
    for (const listener of this.listeners) {
      listener(key, value);
    }
  }

  delete(key: string): void {
    this.values.delete(key);
    for (const listener of this.listeners) {
      listener(key, "");
    }
  }

  clear(): void {
    this.values.clear();
  }

  keys(): string[] {
    return [...this.values.keys()];
  }

  getMany(keys: string[]): Record<string, SettingValue> {
    const result: Record<string, SettingValue> = {};
    for (const key of keys) {
      const value = this.values.get(key);
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  setMany(values: Record<string, SettingValue>): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value);
    }
  }

  on(_event: "change", handler: (key: string, value: SettingValue) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }
}

type ConnectionPathMode = "default-bezier" | "straight" | "custom-elbow";

const nodeDefinitions = [
  createNodeDefinition({
    type: "emitter",
    displayName: "Emitter",
    defaultSize: { width: 180, height: 90 },
    ports: [
      { id: "out-top", type: "output", label: "Out (Top)", position: "top" },
      { id: "out-right", type: "output", label: "Out (Right)", position: "right" },
    ],
  }),
  createNodeDefinition({
    type: "receiver",
    displayName: "Receiver",
    defaultSize: { width: 200, height: 110 },
    ports: [
      { id: "in-left", type: "input", label: "In (Left)", position: "left" },
      { id: "in-bottom", type: "input", label: "In (Bottom)", position: "bottom" },
    ],
  }),
];

const initialData: Partial<NodeEditorData> = {
  nodes: {
    a: {
      id: "a",
      type: "emitter",
      position: { x: 140, y: 300 },
      data: { title: "A (Emitter)" },
    },
    b: {
      id: "b",
      type: "receiver",
      position: { x: 520, y: 170 },
      data: { title: "B (Receiver)" },
    },
    c: {
      id: "c",
      type: "receiver",
      position: { x: 520, y: 420 },
      data: { title: "C (Receiver)" },
    },
  },
  connections: {
    c1: {
      id: "c1",
      fromNodeId: "a",
      fromPortId: "out-top",
      toNodeId: "b",
      toPortId: "in-left",
    },
    c2: {
      id: "c2",
      fromNodeId: "a",
      fromPortId: "out-right",
      toNodeId: "c",
      toPortId: "in-bottom",
    },
  },
};

const createSettingsManager = (): SettingsManager => {
  const storage = new MemorySettingsStorage();
  return new SettingsManager({ storage });
};

export const ConnectionBehaviorExample: React.FC = () => {
  const [settingsManager] = React.useState<SettingsManager>(() => createSettingsManager());
  const [pathMode, setPathMode] = React.useState<ConnectionPathMode>("default-bezier");
  const [rounding, setRounding] = React.useState<ConnectionControlPointRoundingId>("snap-90");
  const [useContextBasedRounding, setUseContextBasedRounding] = React.useState<boolean>(false);

  const isBezierPath = pathMode === "default-bezier";

  React.useEffect(() => {
    settingsManager.setValue("behavior.connectionControlPointRounding", rounding);
  }, [settingsManager, rounding]);

  React.useEffect(() => {
    if (!isBezierPath && useContextBasedRounding) {
      setUseContextBasedRounding(false);
    }
  }, [isBezierPath, useContextBasedRounding]);

  const roundingSource = useContextBasedRounding ? "context" : "settings";

  const connectionBehavior = React.useMemo<Partial<ConnectionBehavior> | undefined>(() => {
    const hasPathOverride = pathMode !== "default-bezier";
    const hasRoundingOverride = isBezierPath && useContextBasedRounding;

    if (!hasPathOverride && !hasRoundingOverride) {
      return undefined;
    }

    const patch: Partial<ConnectionBehavior> = {};

    if (pathMode === "straight") {
      patch.path = { type: "fixed", value: { type: "straight" } };
    }
    if (pathMode === "custom-elbow") {
      patch.path = {
        type: "fixed",
        value: {
          type: "custom",
          calculatePath: ({ outputPosition, inputPosition }) => {
            const elbowX = (outputPosition.x + inputPosition.x) / 2;
            return `M ${outputPosition.x} ${outputPosition.y} L ${elbowX} ${outputPosition.y} L ${elbowX} ${inputPosition.y} L ${inputPosition.x} ${inputPosition.y}`;
          },
        },
      };
    }

    if (useContextBasedRounding) {
      patch.controlPointRounding = {
        type: "byContext",
        resolve: (ctx) => {
          const side = ctx.outputPort?.position;
          if (side === "top" || side === "bottom") {
            return "vertical";
          }
          if (side === "left" || side === "right") {
            return "horizontal";
          }
          return "snap-90";
        },
      };
    }

    return patch;
  }, [pathMode, useContextBasedRounding, isBezierPath]);

  return (
    <ExampleLayout>
      <ExampleWrapper>
        <TwoSideLayout>
          <TwoSideLayoutSidebar>
            <TwoSideLayoutStack>
              <InspectorSection>
                <InspectorFieldRow label="Rounding Source">
                <InspectorButtonGroup
                  options={[
                    { value: "settings", label: "Settings" },
                    { value: "context", label: "By Port Side" },
                  ]}
                  value={roundingSource}
                  onChange={(value) => setUseContextBasedRounding(value === "context")}
                  disabled={!isBezierPath}
                  aria-label="Rounding source"
                />
              </InspectorFieldRow>
              <InspectorFieldRow label="Settings Rounding">
                <InspectorButtonGroup
                  options={[
                    { value: "snap-90", label: "snap-90" },
                    { value: "port-side", label: "port-side" },
                    { value: "horizontal", label: "horizontal" },
                    { value: "vertical", label: "vertical" },
                    { value: "vector", label: "vector" },
                  ]}
                  value={rounding}
                  onChange={(value) => setRounding(value as ConnectionControlPointRoundingId)}
                  disabled={!isBezierPath || useContextBasedRounding}
                  aria-label="Rounding mode"
                  size="compact"
                />
              </InspectorFieldRow>
                <InspectorFieldRow label="Path">
                  <InspectorButtonGroup
                    options={[
                      { value: "default-bezier", label: "bezier" },
                      { value: "straight", label: "straight" },
                      { value: "custom-elbow", label: "elbow" },
                    ]}
                    value={pathMode}
                    onChange={(value) => setPathMode(value as ConnectionPathMode)}
                    aria-label="Path override"
                  />
                </InspectorFieldRow>
              </InspectorSection>
            </TwoSideLayoutStack>
          </TwoSideLayoutSidebar>
          <TwoSideLayoutMain>
            <TwoSideLayoutCanvasFrame className={styles.canvas}>
              <NodeEditorCore
                initialData={initialData}
                nodeDefinitions={nodeDefinitions}
                includeDefaultDefinitions={false}
                autoSaveEnabled={false}
                settingsManager={settingsManager}
                connectionBehavior={connectionBehavior}
              >
                <NodeCanvas />
              </NodeEditorCore>
            </TwoSideLayoutCanvasFrame>
          </TwoSideLayoutMain>
        </TwoSideLayout>
      </ExampleWrapper>
    </ExampleLayout>
  );
};

export default ConnectionBehaviorExample;
