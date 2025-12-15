/**
 * @file Regression test ensuring port positions follow node resize previews.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { StandardNodeDefinition } from "../src/node-definitions/standard";
import { asNodeDefinition } from "../src/types/NodeDefinition";
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

const parsePx = (value: string): number | null => {
  const parsed = Number.parseFloat(value.replace("px", ""));
  return Number.isFinite(parsed) ? parsed : null;
};

describe("node resize port position live update", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("updates port render positions while resizing (before commit)", async () => {
    const initialData: Partial<NodeEditorData> = {
      nodes: {
        a: {
          id: "a",
          type: "standard",
          position: { x: 0, y: 0 },
          size: { width: 200, height: 100 },
          data: { title: "A", content: "" },
        },
      },
      connections: {},
    };

    const { container } = render(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[asNodeDefinition(StandardNodeDefinition)]}>
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

    const portEl = container.querySelector(`[data-node-id="a"][data-port-id="input"]`) as HTMLElement | null;
    expect(portEl).not.toBeNull();

    const baselineTop = parsePx(portEl!.style.top);
    expect(baselineTop).not.toBeNull();

    const handle = container.querySelector(`[data-node-id="a"] [data-resize-handle="se"]`) as HTMLElement | null;
    expect(handle).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(handle!, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 100,
      });
    });
    await nextFrame();

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 2,
        pointerType: "mouse",
        buttons: 1,
        clientX: 200,
        clientY: 160,
      });
    });
    await nextFrame();

    const nextTop = parsePx(portEl!.style.top);
    expect(nextTop).not.toBeNull();
    expect(nextTop).not.toBe(baselineTop);

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 200,
        clientY: 160,
      });
    });
    await nextFrame();
  });
});

