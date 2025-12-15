/**
 * @file Integration tests for connection path behavior (override + settings-driven rounding).
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { createStraightPathModel } from "../src/core/connection/path";
import { SettingsManager } from "../src/settings/SettingsManager";
import type { NodeEditorData } from "../src/types/core";
import type { NodeDefinition } from "../src/types/NodeDefinition";
import { createMemorySettingsStorage } from "../src/settings/storages/MemorySettingsStorage";

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
              createPath: () => createStraightPathModel({ x: 1, y: 2 }, { x: 3, y: 4 }),
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
    const settingsManager = new SettingsManager({ storage: createMemorySettingsStorage() });
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

  it("reads handle offset min/max from settingsManager", async () => {
    const settingsManager = new SettingsManager({ storage: createMemorySettingsStorage() });
    settingsManager.setValue("behavior.connectionControlPointRounding", "horizontal");
    settingsManager.setValue("behavior.connectionHandleOffsetMin", 10);
    settingsManager.setValue("behavior.connectionHandleOffsetMax", 10);

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

    // From port: (100, 25) with "horizontal" and offset=10 -> cp1.x = 110.
    expect(cp1.x).toBeCloseTo(110);
    expect(cp1.y).toBeCloseTo(25);
  });
});
