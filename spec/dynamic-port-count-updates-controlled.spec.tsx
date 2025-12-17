/**
 * @file Regression test: controlled NodeEditor data updates must invalidate dynamic port caches.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { asNodeDefinition } from "../src/types/NodeDefinition";
import type { NodeDefinition } from "../src/types/NodeDefinition";
import type { NodeEditorData } from "../src/types/core";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

describe("dynamic port instance count (controlled)", () => {
  it("updates ports immediately when `data` prop changes", async () => {
    const DynamicPortNodeDefinition: NodeDefinition<{ title: string; content: string; portCount: number }> = {
      type: "dynamic-ports",
      displayName: "Dynamic Ports",
      category: "Test",
      defaultData: { title: "Dynamic", content: "", portCount: 1 },
      defaultSize: { width: 240, height: 120 },
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
          data: { title: "A", content: "", portCount: 2 },
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

    const { container, rerender } = render(
      <NodeEditorCore data={data2} nodeDefinitions={[asNodeDefinition(DynamicPortNodeDefinition)]}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    expect(container.querySelectorAll(`[data-node-id="a"][data-port-id]`)).toHaveLength(2);

    rerender(
      <NodeEditorCore data={data4} nodeDefinitions={[asNodeDefinition(DynamicPortNodeDefinition)]}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    expect(container.querySelectorAll(`[data-node-id="a"][data-port-id]`)).toHaveLength(4);
  });
});

