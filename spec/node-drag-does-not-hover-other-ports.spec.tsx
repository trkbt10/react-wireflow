/**
 * @file Regression test ensuring node dragging doesn't trigger port hover updates on unrelated nodes.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import type { NodeDefinition } from "../src/types/NodeDefinition";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { useEditorActionState } from "../src/contexts/composed/EditorActionStateContext";

const ensurePointerCaptureApis = () => {
  if (typeof HTMLElement === "undefined") {
    return;
  }
  const proto = HTMLElement.prototype as unknown as {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
  };
  if (!proto.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!proto.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      value: () => undefined,
      configurable: true,
    });
  }
};

const HoverProbe: React.FC = () => {
  const { state } = useEditorActionState();
  const hovered = state.hoveredPort ? `${state.hoveredPort.nodeId}:${state.hoveredPort.id}` : "none";
  return <div data-testid="hovered-port">{hovered}</div>;
};

describe("node drag port hover regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not set hoveredPort when pointer enters another node port during node drag", async () => {
    const nodeDefinition: NodeDefinition = {
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
    };

    const initialData = {
      nodes: {
        a: { id: "a", type: "io", position: { x: 0, y: 0 }, size: { width: 100, height: 50 }, data: { title: "A" } },
        b: { id: "b", type: "io", position: { x: 240, y: 0 }, size: { width: 100, height: 50 }, data: { title: "B" } },
      },
      connections: {},
    };

    const { container, getByTestId } = render(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[nodeDefinition]} includeDefaultDefinitions={true}>
        <NodeCanvas />
        <HoverProbe />
      </NodeEditorCore>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const nodeEl = container.querySelector('[data-node-id="a"]') as HTMLElement | null;
    const otherPortEl = container.querySelector('[data-node-id="b"][data-port-id="in"]') as HTMLElement | null;
    expect(nodeEl).not.toBeNull();
    expect(otherPortEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(nodeEl!, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 10,
      });
    });

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: "mouse",
        buttons: 1,
        clientX: 60,
        clientY: 10,
      });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(getByTestId("hovered-port").textContent).toBe("none");

    await act(async () => {
      fireEvent.pointerEnter(otherPortEl!, {
        pointerId: 1,
        pointerType: "mouse",
        buttons: 1,
        clientX: 250,
        clientY: 25,
      });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(getByTestId("hovered-port").textContent).toBe("none");

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 60,
        clientY: 10,
      });
    });
  });
});

