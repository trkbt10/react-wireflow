/**
 * @file Regression test ensuring custom node renderers receive live size updates during resize.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { createNodeDefinition, type NodeRendererProps } from "../src/types/NodeDefinition";
import type { NodeEditorData } from "../src/types/core";
import { asNodeDefinition } from "../src/types/NodeDefinition";

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

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

type CustomData = { title: string };

const CustomNodeRenderer = ({ node }: NodeRendererProps<CustomData>): React.ReactElement => {
  return (
    <div data-testid="custom-node-size">
      {node.size?.width ?? "?"}x{node.size?.height ?? "?"}
    </div>
  );
};

const customNodeDefinition = createNodeDefinition<CustomData>({
  type: "custom",
  displayName: "Custom",
  defaultData: { title: "Custom" },
  defaultSize: { width: 160, height: 80 },
  renderNode: CustomNodeRenderer,
});

describe("custom node live resize update", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("updates custom renderer output while resizing (before commit)", async () => {
    const initialData: Partial<NodeEditorData> = {
      nodes: {
        a: {
          id: "a",
          type: "custom",
          position: { x: 0, y: 0 },
          size: { width: 160, height: 80 },
          data: { title: "A" },
        },
      },
      connections: {},
    };

    const { container } = render(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[asNodeDefinition(customNodeDefinition)]}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    expect(screen.getByTestId("custom-node-size").textContent).toBe("160x80");

    const nodeEl = container.querySelector(`[data-node-id="a"]`) as HTMLElement | null;
    expect(nodeEl).not.toBeNull();

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
    await nextFrame();

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 10,
        clientY: 10,
      });
    });
    await nextFrame();

    const handle = container.querySelector(`[data-node-id="a"] [data-resize-handle="se"]`) as HTMLElement | null;
    expect(handle).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(handle!, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 160,
        clientY: 80,
      });
    });
    await nextFrame();

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 2,
        pointerType: "mouse",
        buttons: 1,
        clientX: 220,
        clientY: 120,
      });
    });
    await nextFrame();

    expect(screen.getByTestId("custom-node-size").textContent).not.toBe("160x80");

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 220,
        clientY: 120,
      });
    });
    await nextFrame();
  });
});
