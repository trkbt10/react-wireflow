/**
 * @file Regression test ensuring node resize does not remount ports on other nodes.
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

describe("node resize port remount regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not remount ports on a different node while resizing", async () => {
    const mounts: Record<string, number> = {};
    const unmounts: Record<string, number> = {};

    const CountingPortInner: React.FC<PortViewProps> = (props) => {
      const key = `${props.port.nodeId}:${props.port.id}`;
      React.useEffect(() => {
        mounts[key] = (mounts[key] ?? 0) + 1;
        return () => {
          unmounts[key] = (unmounts[key] ?? 0) + 1;
        };
      }, [key]);
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
        b: {
          id: "b",
          type: "standard",
          position: { x: 320, y: 0 },
          size: { width: 200, height: 100 },
          data: { title: "B", content: "" },
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

    const baselineMounts = { ...mounts };
    const baselineUnmounts = { ...unmounts };

    const nodeEl = container.querySelector(`[data-node-id="a"]`) as HTMLElement | null;
    expect(nodeEl).not.toBeNull();

    fireEvent.pointerDown(nodeEl!, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: 10,
    });
    await nextFrame();

    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      clientX: 10,
      clientY: 10,
    });
    await nextFrame();

    const handle = container.querySelector(`[data-node-id="a"] [data-resize-handle="se"]`) as HTMLElement | null;
    expect(handle).not.toBeNull();

    fireEvent.pointerDown(handle!, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientX: 200,
      clientY: 100,
    });
    await nextFrame();

    for (const step of [1, 2, 3]) {
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: "mouse",
        buttons: 1,
        clientX: 200 + step * 10,
        clientY: 100 + step * 8,
      });
      // allow rAF throttles to settle if any
      await nextFrame();
    }

    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      clientX: 230,
      clientY: 124,
    });
    await nextFrame();

    expect(mounts).toEqual(baselineMounts);
    expect(unmounts).toEqual(baselineUnmounts);
  });
});
