/**
 * @file Integration tests for connection path behavior (override + settings-driven rounding).
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { SettingsManager } from "../src/settings/SettingsManager";
import type { SettingsStorage, SettingValue } from "../src/settings/types";
import type { NodeEditorData } from "../src/types/core";
import type { NodeDefinition } from "../src/types/NodeDefinition";

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

const waitNextFrame = async (): Promise<void> => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const createIoNodeDefinition = (): NodeDefinition => ({
  type: "io",
  displayName: "IO",
  description: "IO test node",
  category: "Test",
  defaultData: { title: "IO" },
  defaultSize: { width: 100, height: 50 },
  behaviors: ["node"],
  ports: [
    { id: "in", type: "input", label: "in", position: "left" },
    { id: "out", type: "output", label: "out", position: "right" },
  ],
});

const createConnectedData = (): NodeEditorData => ({
  nodes: {
    a: {
      id: "a",
      type: "io",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      data: { title: "A" },
    },
    b: {
      id: "b",
      type: "io",
      position: { x: 200, y: 40 },
      size: { width: 100, height: 50 },
      data: { title: "B" },
    },
  },
  connections: {
    c1: {
      id: "c1",
      fromNodeId: "a",
      fromPortId: "out",
      toNodeId: "b",
      toPortId: "in",
    },
  },
});

const getConnectionPathD = (container: HTMLElement, connectionId: string): string => {
  const group = container.querySelector(`[data-connection-id="${connectionId}"]`) as SVGGElement | null;
  expect(group).not.toBeNull();
  const path = group!.querySelector("path") as SVGPathElement | null;
  expect(path).not.toBeNull();
  const d = path!.getAttribute("d");
  expect(d).toBeTruthy();
  return d as string;
};

const parseBezierCp1 = (d: string): { x: number; y: number } => {
  const match = d.match(/^M\s+([-\d.]+)\s+([-\d.]+)\s+C\s+([-\d.]+)\s+([-\d.]+),\s+([-\d.]+)\s+([-\d.]+),\s+([-\d.]+)\s+([-\d.]+)$/);
  if (!match) {
    throw new Error(`Unexpected path format: ${d}`);
  }
  return { x: Number(match[3]), y: Number(match[4]) };
};

describe("connection path behavior", () => {
  it("allows overriding the path calculation via NodeEditorCoreProps.connectionBehavior", async () => {
    const initialData = createConnectedData();
    const nodeDefinition = createIoNodeDefinition();

    const { container } = render(
      <NodeEditorCore
        initialData={initialData}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
        connectionBehavior={{
          path: {
            type: "fixed",
            value: {
              type: "custom",
              calculatePath: () => "M 1 2 L 3 4",
            },
          },
        }}
      >
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await waitNextFrame();
    await waitNextFrame();

    expect(getConnectionPathD(container, "c1")).toBe("M 1 2 L 3 4");
  });

  it("reads control point rounding from settingsManager", async () => {
    const settingsManager = new SettingsManager({ storage: new MemorySettingsStorage() });
    settingsManager.setValue("behavior.connectionControlPointRounding", "vertical");

    const initialData = createConnectedData();
    const nodeDefinition = createIoNodeDefinition();

    const { container } = render(
      <NodeEditorCore
        initialData={initialData}
        settingsManager={settingsManager}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
      >
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await waitNextFrame();
    await waitNextFrame();

    const d = getConnectionPathD(container, "c1");
    const cp1 = parseBezierCp1(d);

    // From port: (100, 25), To port: (200, 65), dx=100 dy=40.
    // With "vertical", cp1.x should remain aligned to from.x.
    expect(cp1.x).toBeCloseTo(100);
  });
});
