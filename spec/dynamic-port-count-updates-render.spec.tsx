/**
 * @file Regression test: dynamic port instance count updates should re-render ports.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { asNodeDefinition } from "../src/types/NodeDefinition";
import type { NodeDefinition } from "../src/types/NodeDefinition";
import type { NodeEditorApiValue } from "../src/contexts/composed/node-editor/context";
import { useNodeEditorApi } from "../src/contexts/composed/node-editor/context";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const NodeEditorApiProbe: React.FC<{ onReady: (api: NodeEditorApiValue) => void }> = ({ onReady }) => {
  const api = useNodeEditorApi();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
};

describe("dynamic port instance count render", () => {
  it("re-renders ports when node data changes instances()", async () => {
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

    const apiRef: { current: NodeEditorApiValue | null } = { current: null };
    const onReady = (api: NodeEditorApiValue) => {
      apiRef.current = api;
    };

    const initialData = {
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

    const { container } = render(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[asNodeDefinition(DynamicPortNodeDefinition)]}>
        <NodeEditorApiProbe onReady={onReady} />
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const portsBefore = container.querySelectorAll(`[data-node-id="a"][data-port-id]`);
    expect(portsBefore).toHaveLength(2);

    const api = apiRef.current;
    expect(api).not.toBeNull();
    if (!api) {
      throw new Error("node editor api not ready");
    }

    await act(async () => {
      api.actions.updateNode("a", {
        data: { ...api.getState().nodes.a!.data, portCount: 4 },
      });
    });
    await nextFrame();

    const portsAfter = container.querySelectorAll(`[data-node-id="a"][data-port-id]`);
    expect(portsAfter).toHaveLength(4);
  });
});

