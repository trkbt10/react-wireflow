/**
 * @file Regression test ensuring node port rendering updates when NodeDefinition changes.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import type { NodeEditorData } from "../src/types/core";
import type { NodeDefinition } from "../src/types/NodeDefinition";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const createInitialData = (): Partial<NodeEditorData> => {
  return {
    nodes: {
      n1: {
        id: "n1",
        type: "custom",
        position: { x: 0, y: 0 },
        size: { width: 220, height: 72 },
        data: { title: "n1" },
      },
    },
    connections: {},
  };
};

const createDefinition = (portLabel: string): NodeDefinition => {
  return {
    type: "custom",
    displayName: "Custom",
    ports: [{ id: "in", type: "input", label: portLabel, position: "left" }],
  };
};

describe("definition update port render regression", () => {
  it("updates rendered port label/title when nodeDefinitions changes (without node data changes)", async () => {
    const initialData = createInitialData();
    const defV1 = createDefinition("In v1");
    const defV2 = createDefinition("In v2");

    const { container, rerender } = render(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[defV1]} includeDefaultDefinitions={false}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const queryPort = () => {
      return container.querySelector(`[data-node-id="n1"][data-port-id="in"]`) as HTMLElement | null;
    };

    const portV1 = queryPort();
    expect(portV1).not.toBeNull();
    expect(portV1?.getAttribute("title")).toBe("In v1");

    rerender(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[defV2]} includeDefaultDefinitions={false}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const portV2 = queryPort();
    expect(portV2).not.toBeNull();
    expect(portV2?.getAttribute("title")).toBe("In v2");
  });
});

