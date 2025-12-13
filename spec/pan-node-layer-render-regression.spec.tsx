/**
 * @file Render-regression test ensuring NodeLayer does not re-render nodes while panning the canvas.
 */
import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { NodeTreeListPanel } from "../src/components/inspector/panels/NodeTreeListPanel";
import { NodeViewContainer, type NodeViewContainerProps } from "../src/components/node/NodeViewContainer";

let nodeRendererRenders = 0;

const CountingNodeViewInner: React.FC<NodeViewContainerProps> = (props) => {
  nodeRendererRenders++;
  return <NodeViewContainer {...props} />;
};

const CountingNodeView = React.memo(CountingNodeViewInner);
CountingNodeView.displayName = "CountingNodeView";

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

describe("NodeLayer pan render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  beforeEach(() => {
    nodeRendererRenders = 0;
  });

  it("does not re-render node renderer while panning", async () => {
    const initialData = {
      nodes: Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => {
          const id = `n${index}`;
          return [
            id,
            {
              id,
              type: "label",
              position: { x: (index % 10) * 240, y: Math.floor(index / 10) * 120 },
              size: { width: 220, height: 72 },
              data: { title: id, labelTitle: id },
            },
          ];
        }),
      ),
      connections: {},
    };

    const { getByRole } = render(
      <NodeEditorCore
        initialData={initialData}
        renderers={{
          node: CountingNodeView,
        }}
      >
        <NodeCanvas />
        <NodeTreeListPanel />
      </NodeEditorCore>,
    );

    // Allow any mount-time effects (e.g. viewBox measurement) to settle.
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const baseline = nodeRendererRenders;

    const canvas = getByRole("application", { name: "Node Editor Canvas" });
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      pointerType: "mouse",
      button: 1,
      buttons: 4,
      clientX: 10,
      clientY: 10,
    });
    for (const step of [1, 2, 3, 4, 5, 6, 7, 8]) {
      fireEvent.pointerMove(canvas, {
        pointerId: 1,
        pointerType: "mouse",
        buttons: 4,
        clientX: 10 + step * 6,
        clientY: 10 + step * 4,
      });
    }
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      pointerType: "mouse",
      button: 1,
      buttons: 0,
      clientX: 80,
      clientY: 60,
    });

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    expect(nodeRendererRenders).toBe(baseline);
  });
});

