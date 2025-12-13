/**
 * @file Render-regression test ensuring node drag does not cascade commits into all nodes.
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
    counts,
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

describe("node drag render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit non-dragged nodes during pointer move", async () => {
    const counter = createCommitCounter();
    const CountingNodeComponent: React.FC<NodeViewProps> = (props) => {
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
    const CountingNode = React.memo(CountingNodeComponent);

    const initialData = createInitialData(30);
    const { container } = render(
      <NodeEditorCore initialData={initialData} renderers={{ node: CountingNode }}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const nodeId = "n0";
    const nodeEl = container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    expect(nodeEl).not.toBeNull();

    const baseline = counter.snapshot();

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

    const afterDown = counter.snapshot();

    await act(async () => {
      for (const step of [1, 2, 3, 4, 5]) {
        fireEvent.pointerMove(window, {
          pointerId: 1,
          pointerType: "mouse",
          buttons: 1,
          clientX: 10 + step * 10,
          clientY: 10,
        });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    });

    const afterMoves = counter.snapshot();

    expect(afterMoves[nodeId]).toBeGreaterThan(afterDown[nodeId] ?? baseline[nodeId] ?? 0);

    const nonDraggedDeltas = Object.entries(afterDown)
      .filter(([id]) => id !== nodeId)
      .map(([id, countAfterDown]) => (afterMoves[id] ?? 0) - countAfterDown);

    const maxNonDraggedDelta = Math.max(...nonDraggedDeltas);
    // Allow a small amount of incidental commits (e.g., initial layout/viewbox effects),
    // but prevent per-pointermove cascades across all nodes.
    expect(maxNonDraggedDelta).toBeLessThanOrEqual(2);

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
