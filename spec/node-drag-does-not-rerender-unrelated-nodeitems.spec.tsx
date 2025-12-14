/**
 * @file Regression test: dragging a node must not re-render unrelated NodeItems (even with un-memoized node renderer).
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

type RenderCounts = Record<string, number>;

const createRenderCounter = () => {
  const counts: RenderCounts = {};
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

describe("node drag does not rerender unrelated NodeItems", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not re-render non-dragged nodes on pointer move", async () => {
    const counter = createRenderCounter();

    const UnmemoizedCountingNode: React.FC<NodeViewProps> = (props) => {
      counter.inc(props.node.id);
      return <NodeViewContainer {...props} />;
    };

    const initialData = createInitialData(40);
    const { container } = render(
      <NodeEditorCore initialData={initialData} renderers={{ node: UnmemoizedCountingNode }}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const nodeId = "n0";
    const nodeEl = container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
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

    const nonDraggedDeltas = Object.entries(afterDown)
      .filter(([id]) => id !== nodeId)
      .map(([id, countAfterDown]) => (afterMoves[id] ?? 0) - countAfterDown);

    const maxNonDraggedDelta = Math.max(...nonDraggedDeltas);
    if (maxNonDraggedDelta > 0) {
      const offenders = Object.entries(afterDown)
        .filter(([id]) => id !== nodeId)
        .map(([id, before]) => ({ id, delta: (afterMoves[id] ?? 0) - before }))
        .filter((entry) => entry.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 8);
      throw new Error(`non-dragged nodes re-rendered: ${JSON.stringify(offenders)}`);
    }
    expect(maxNonDraggedDelta).toBeLessThanOrEqual(0);
  });

  it("does not re-render non-moved nodes on pointer up (moveNodes commit)", async () => {
    const counter = createRenderCounter();

    const UnmemoizedCountingNode: React.FC<NodeViewProps> = (props) => {
      counter.inc(props.node.id);
      return <NodeViewContainer {...props} />;
    };

    const initialData = createInitialData(40);
    const { container } = render(
      <NodeEditorCore initialData={initialData} renderers={{ node: UnmemoizedCountingNode }}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const movedNodeId = "n0";
    const movedNodeEl = container.querySelector(`[data-node-id="${movedNodeId}"]`) as HTMLElement | null;
    expect(movedNodeEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(movedNodeEl!, {
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

    const beforeUp = counter.snapshot();

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 70,
        clientY: 10,
      });
    });
    await nextFrame();

    const afterUp = counter.snapshot();

    const nonMovedDeltas = Object.entries(beforeUp)
      .filter(([id]) => id !== movedNodeId)
      .map(([id, before]) => (afterUp[id] ?? 0) - before);

    const maxNonMovedDelta = Math.max(...nonMovedDeltas);
    if (maxNonMovedDelta > 0) {
      const offenders = Object.entries(beforeUp)
        .filter(([id]) => id !== movedNodeId)
        .map(([id, before]) => ({ id, delta: (afterUp[id] ?? 0) - before }))
        .filter((entry) => entry.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 8);
      throw new Error(`non-moved nodes re-rendered on commit: ${JSON.stringify(offenders)}`);
    }
    expect(maxNonMovedDelta).toBeLessThanOrEqual(0);
  });
});
