/**
 * @file Render-regression test ensuring NodeLayer itself does not commit while panning.
 */
import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { NodeLayer } from "../src/components/node/layer/NodeLayer";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";

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

describe("NodeLayer component pan render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit NodeLayer while panning the canvas", async () => {
    let nodeLayerCommits = 0;

    const initialData = {
      nodes: Object.fromEntries(
        Array.from({ length: 200 }, (_, index) => {
          const id = `n${index}`;
          return [
            id,
            {
              id,
              type: "label",
              position: { x: (index % 20) * 240, y: Math.floor(index / 20) * 120 },
              size: { width: 220, height: 72 },
              data: { title: id, labelTitle: id },
            },
          ];
        }),
      ),
      connections: {},
    };

    const { getByRole } = render(
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
      </NodeEditorCore>,
    );

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const baseline = nodeLayerCommits;

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

    expect(nodeLayerCommits).toBe(baseline);
  });
});

