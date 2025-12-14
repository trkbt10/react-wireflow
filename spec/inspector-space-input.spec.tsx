/**
 * @file Regression test: Space key should be typeable in inspector inputs (must not trigger canvas space-panning).
 */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { useNodeCanvasState } from "../src/contexts/composed/canvas/viewport/context";
import { InspectorInput } from "../src/components/inspector/parts/InspectorInput";

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

const SpacePanningProbe: React.FC = () => {
  const state = useNodeCanvasState();
  return <div data-testid="space-panning">{String(state.isSpacePanning)}</div>;
};

const Harness: React.FC = () => {
  const [value, setValue] = React.useState("");
  return (
    <>
      <CanvasPointerActionProvider>
        <CanvasBase>
          <div />
        </CanvasBase>
      </CanvasPointerActionProvider>
      <InspectorInput
        data-testid="inspector-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <SpacePanningProbe />
    </>
  );
};

describe("inspector space input", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("allows typing spaces in InspectorInput without toggling space-panning", async () => {
    const user = userEvent.setup();
    render(
      <NodeEditorCore initialData={{ nodes: {}, connections: {} }}>
        <Harness />
      </NodeEditorCore>,
    );

    const input = screen.getByTestId("inspector-input") as HTMLInputElement;

    await user.click(input);
    await user.type(input, "a b");
    expect(input.value).toBe("a b");
    expect(screen.getByTestId("space-panning").textContent).toBe("false");
  });
});
