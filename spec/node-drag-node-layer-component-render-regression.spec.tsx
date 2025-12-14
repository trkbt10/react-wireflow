/**
 * @file Render-regression test ensuring NodeLayer itself does not commit repeatedly while dragging a node.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { NodeLayer } from "../src/components/node/layer/NodeLayer";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";
import { useCanvasInteractionState } from "../src/contexts/composed/canvas/interaction/context";
import type { NodeEditorData } from "../src/types/core";

const DragProbe: React.FC = () => {
  const { dragState } = useCanvasInteractionState();
  return (
    <div data-testid="drag-offset">
      {dragState ? `${dragState.offset.x},${dragState.offset.y}` : "none"}
    </div>
  );
};

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

const createInitialData = (nodeCount: number): Partial<NodeEditorData> => {
  const nodes: NodeEditorData["nodes"] = {};
  Array.from({ length: nodeCount }).forEach((_, index) => {
    const id = `n${index}`;
    nodes[id] = {
      id,
      type: "label",
      position: { x: index * 240, y: 0 },
      size: { width: 220, height: 72 },
      data: { title: id, labelTitle: id },
    };
  });
  return { nodes, connections: {} };
};

describe("NodeLayer component node-drag render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit NodeLayer during pointer move while dragging", async () => {
    let nodeLayerCommits = 0;

    const initialData = createInitialData(120);

    const { container } = render(
      <NodeEditorCore initialData={initialData}>
        <CanvasPointerActionProvider>
          <CanvasBase>
            <React.Profiler
              id="node-layer"
              onRender={() => {
                nodeLayerCommits++;
              }}
            >
              <NodeLayer />
            </React.Profiler>
          </CanvasBase>
        </CanvasPointerActionProvider>
        <DragProbe />
      </NodeEditorCore>,
    );

    await nextFrame();

    const nodeId = "n0";
    const nodeEl = container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
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

    const afterDownTransform = nodeEl!.style.transform;

    const afterDown = nodeLayerCommits;

    await act(async () => {
      for (const step of [1, 2, 3, 4, 5, 6]) {
        fireEvent.pointerMove(window, {
          pointerId: 1,
          pointerType: "mouse",
          buttons: 1,
          clientX: 10 + step * 12,
          clientY: 10 + step * 6,
        });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    });

    expect(nodeEl!.style.transform).not.toBe(afterDownTransform);

    const probe = container.querySelector('[data-testid="drag-offset"]') as HTMLElement | null;
    expect(probe).not.toBeNull();
    expect(probe!.textContent).not.toBe("none");
    expect(probe!.textContent).not.toBe("0,0");

    expect(nodeLayerCommits).toBe(afterDown);

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 120,
        clientY: 60,
      });
    });
  });
});
