/**
 * @file Regression test ensuring port hover/leave does not remount port components.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { PortView, type PortViewProps } from "../src/components/ports/PortView";
import { StandardNodeDefinition } from "../src/node-definitions/standard";
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

describe("port hover remount regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not remount ports when hovering and leaving", async () => {
    const mounts: Record<string, number> = {};
    const unmounts: Record<string, number> = {};

    const CountingPortInner: React.FC<PortViewProps> = (props) => {
      React.useEffect(() => {
        mounts[props.port.id] = (mounts[props.port.id] ?? 0) + 1;
        return () => {
          unmounts[props.port.id] = (unmounts[props.port.id] ?? 0) + 1;
        };
      }, [props.port.id]);
      return <PortView {...props} />;
    };
    const CountingPort = React.memo(CountingPortInner);

    const initialData = {
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
      <NodeEditorCore
        initialData={initialData}
        nodeDefinitions={[asNodeDefinition(StandardNodeDefinition)]}
        renderers={{ port: CountingPort }}
      >
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const portEl = container.querySelector(`[data-node-id="a"][data-port-id="output"]`) as HTMLElement | null;
    expect(portEl).not.toBeNull();

    const baselineMounts = { ...mounts };
    const baselineUnmounts = { ...unmounts };

    fireEvent.pointerEnter(portEl!, { pointerId: 1, pointerType: "mouse" });
    await nextFrame();

    fireEvent.pointerLeave(portEl!, { pointerId: 1, pointerType: "mouse" });
    await nextFrame();

    expect(mounts).toEqual(baselineMounts);
    expect(unmounts).toEqual(baselineUnmounts);
  });
});
