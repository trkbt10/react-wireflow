/**
 * @file Regression test ensuring node resize does not re-render unrelated nodes.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import type { NodeViewProps } from "../src/components/node/NodeView";
import { NodeViewContainer } from "../src/components/node/NodeViewContainer";
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

type NodeCommitCounts = Record<string, number>;

const createCommitCounter = () => {
  const counts: NodeCommitCounts = {};
  return {
    inc: (nodeId: string) => {
      counts[nodeId] = (counts[nodeId] ?? 0) + 1;
    },
    snapshot: () => ({ ...counts }),
  };
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

describe("node resize render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit unrelated nodes while resizing a node", async () => {
    const counter = createCommitCounter();
    const CountingNodeInner: React.FC<NodeViewProps> = (props) => {
      return (
        <React.Profiler
          id={`node-${props.node.id}`}
          onRender={() => {
            counter.inc(props.node.id);
          }}
        >
          <NodeViewContainer {...props} />
        </React.Profiler>
      );
    };
    const CountingNode = React.memo(CountingNodeInner);

    const initialData = createInitialData(40);
    const { container } = render(
      <NodeEditorCore initialData={initialData} renderers={{ node: CountingNode }}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const resizedNodeId = "n0";
    const resizedNodeEl = container.querySelector(`[data-node-id="${resizedNodeId}"]`) as HTMLElement | null;
    expect(resizedNodeEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(resizedNodeEl!, {
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

    const handle = container.querySelector(`[data-node-id="${resizedNodeId}"] [data-resize-handle="se"]`) as
      | HTMLElement
      | null;
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

    const beforeResizeMoves = counter.snapshot();

    await act(async () => {
      for (const step of [1, 2, 3]) {
        fireEvent.pointerMove(window, {
          pointerId: 2,
          pointerType: "mouse",
          buttons: 1,
          clientX: 220 + step * 10,
          clientY: 72 + step * 8,
        });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    });
    await nextFrame();

    const afterResizeMoves = counter.snapshot();

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 250,
        clientY: 96,
      });
    });
    await nextFrame();

    const nonResizedDeltas = Object.entries(beforeResizeMoves)
      .filter(([id]) => id !== resizedNodeId)
      .map(([id, before]) => (afterResizeMoves[id] ?? 0) - before);

    const maxNonResizedDelta = Math.max(...nonResizedDeltas);
    if (maxNonResizedDelta > 0) {
      const offenders = Object.entries(beforeResizeMoves)
        .filter(([id]) => id !== resizedNodeId)
        .map(([id, before]) => ({ id, delta: (afterResizeMoves[id] ?? 0) - before }))
        .filter((entry) => entry.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 6);
      throw new Error(`unrelated node commits detected during resize: ${JSON.stringify(offenders)}`);
    }
    expect(maxNonResizedDelta).toBeLessThanOrEqual(0);
  });
});

