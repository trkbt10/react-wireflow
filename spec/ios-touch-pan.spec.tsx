/**
 * @file Regression test ensuring touch dragging pans the canvas (iOS Safari / WebKit behavior).
 */
import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { useNodeCanvasViewportOffset } from "../src/contexts/composed/canvas/viewport/context";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";

const ensurePointerCaptureApis = (): void => {
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

const OffsetReadout: React.FC = () => {
  const offset = useNodeCanvasViewportOffset();
  return <output data-testid="offset">{`${offset.x},${offset.y}`}</output>;
};

describe("iOS touch pan", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("pans viewport when dragging on empty canvas with touch pointer events", () => {
    const { getByRole, getByTestId } = render(
      <NodeEditorCore>
        <CanvasPointerActionProvider>
          <CanvasBase>
            <OffsetReadout />
          </CanvasBase>
        </CanvasPointerActionProvider>
      </NodeEditorCore>,
    );

    expect(getByTestId("offset").textContent).toBe("0,0");

    const canvas = getByRole("application", { name: "Node Editor Canvas" });
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 22,
      clientY: 27,
    });

    expect(getByTestId("offset").textContent).toBe("12,17");

    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 22,
      clientY: 27,
    });
  });
});

