/**
 * @file Integration test: custom connection renderers can compute paths via props/context (no hooks).
 */
import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import type { NodeEditorData } from "../src/types/core";
import type { NodeDefinition, ConnectionRenderContext } from "../src/types/NodeDefinition";

const waitNextFrame = async (): Promise<void> => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

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

const renderConnectionSwappingEndpoints = (
  context: ConnectionRenderContext,
  _defaultRender: () => React.ReactElement,
): React.ReactElement => {
  if (!context.toNode || !context.toPort) {
    throw new Error("Expected toNode/toPort to be resolved for connected connections");
  }

  const d = context.path.calculateDefaultPath({
    outputPosition: context.toPosition,
    inputPosition: context.fromPosition,
  });

  return (
    <g data-testid="custom-connection">
      <path data-testid="custom-connection-path" d={d} />
    </g>
  );
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
    { id: "out", type: "output", label: "out", position: "right", renderConnection: renderConnectionSwappingEndpoints },
  ],
});

describe("custom connection renderer path calculators", () => {
  it("provides a no-hooks path calculation API on ConnectionRenderContext", async () => {
    const initialData = createConnectedData();
    const nodeDefinition = createIoNodeDefinition();

    render(
      <NodeEditorCore
        initialData={initialData}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
        connectionBehavior={{ path: { type: "fixed", value: { type: "straight" } } }}
      >
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await waitNextFrame();
    await waitNextFrame();

    const element = screen.getByTestId("custom-connection-path");
    expect(element.getAttribute("d")).toBe("M 200 65 L 100 25");
  });
});
