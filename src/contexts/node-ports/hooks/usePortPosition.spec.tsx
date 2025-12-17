/**
 * @file Regression tests for dynamic port position hooks.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../../../NodeEditorCore";
import { NodeCanvas } from "../../../components/canvas/NodeCanvas";
import { useDynamicPortPosition } from "./usePortPosition";
import { asNodeDefinition } from "../../../types/NodeDefinition";
import type { NodeDefinition } from "../../../types/NodeDefinition";
import type { NodeEditorData } from "../../../types/core";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const DynamicPositionProbe: React.FC<{ nodeId: string; portId: string }> = ({ nodeId, portId }) => {
  const position = useDynamicPortPosition(nodeId, portId);
  const text = position ? `${position.renderPosition.x},${position.renderPosition.y}` : "none";
  return <div data-testid="pos">{text}</div>;
};

describe("useDynamicPortPosition", () => {
  it("updates when controlled node data changes port instances", async () => {
    const DynamicPortNodeDefinition: NodeDefinition<{ title: string; portCount: number }> = {
      type: "dynamic-ports",
      displayName: "Dynamic Ports",
      category: "Test",
      defaultData: { title: "Dynamic", portCount: 1 },
      behaviors: ["node"],
      ports: [
        {
          id: "in",
          type: "input",
          label: "In",
          position: "left",
          instances: ({ node }) => {
            const raw = node.data.portCount;
            return typeof raw === "number" ? raw : 0;
          },
        },
      ],
    };

    const data2: NodeEditorData = {
      nodes: {
        a: {
          id: "a",
          type: "dynamic-ports",
          position: { x: 0, y: 0 },
          size: { width: 240, height: 120 },
          data: { title: "A", portCount: 2 },
        },
      },
      connections: {},
    };

    const data4: NodeEditorData = {
      ...data2,
      nodes: {
        ...data2.nodes,
        a: { ...data2.nodes.a, data: { ...data2.nodes.a.data, portCount: 4 } },
      },
    };

    const { getByTestId, rerender } = render(
      <NodeEditorCore data={data2} nodeDefinitions={[asNodeDefinition(DynamicPortNodeDefinition)]}>
        <DynamicPositionProbe nodeId="a" portId="in-3" />
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();
    expect(getByTestId("pos").textContent).toBe("none");

    rerender(
      <NodeEditorCore data={data4} nodeDefinitions={[asNodeDefinition(DynamicPortNodeDefinition)]}>
        <DynamicPositionProbe nodeId="a" portId="in-3" />
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();
    expect(getByTestId("pos").textContent).not.toBe("none");
  });
});

