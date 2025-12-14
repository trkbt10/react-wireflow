/**
 * @file Regression test ensuring node size updates during resize (before commit).
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import type { NodeEditorData } from "../src/types/core";

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

describe("node resize live update", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("updates node width/height while resizing (before pointer up commit)", async () => {
    const initialData: Partial<NodeEditorData> = {
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

    const { container } = render(
      <NodeEditorCore initialData={initialData}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

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

    const baselineWidth = nodeEl!.style.width;
    const baselineHeight = nodeEl!.style.height;
    expect(baselineWidth).toBe("220px");
    expect(baselineHeight).toBe("72px");

    const handle = container.querySelector(`[data-node-id="a"] [data-resize-handle="se"]`) as HTMLElement | null;
    expect(handle).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(handle!, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 220,
        clientY: 72,
      });
    });
    await nextFrame();

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 2,
        pointerType: "mouse",
        buttons: 1,
        clientX: 260,
        clientY: 96,
      });
    });
    await nextFrame();

    expect(nodeEl!.dataset.resizing).toBe("true");
    expect(nodeEl!.style.width).not.toBe(baselineWidth);
    expect(nodeEl!.style.height).not.toBe(baselineHeight);

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 260,
        clientY: 96,
      });
    });
    await nextFrame();
  });
});

