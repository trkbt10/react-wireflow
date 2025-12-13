/**
 * @file Integration test for node dragging interaction.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { useCanvasInteractionState } from "../src/contexts/composed/canvas/interaction/context";

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

describe("node drag interaction", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("moves a node visually during drag", async () => {
    const initialData = {
      nodes: {
        a: {
          id: "a",
          type: "label",
          position: { x: 0, y: 0 },
          size: { width: 220, height: 72 },
          data: { title: "A", labelTitle: "A" },
        },
      },
      connections: {},
    };

    const { container, getByTestId } = render(
      <NodeEditorCore initialData={initialData}>
        <NodeCanvas />
        <DragProbe />
      </NodeEditorCore>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const nodeEl = container.querySelector('[data-node-id="a"]') as HTMLElement | null;
    expect(nodeEl).not.toBeNull();
    const initialTransform = nodeEl!.style.transform;

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
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
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

    expect(getByTestId("drag-offset").textContent).not.toBe("none");
    expect(getByTestId("drag-offset").textContent).not.toBe("0,0");

    const movedTransform = nodeEl!.style.transform;
    expect(movedTransform).not.toBe(initialTransform);

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
