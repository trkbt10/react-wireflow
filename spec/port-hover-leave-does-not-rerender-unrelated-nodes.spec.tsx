/**
 * @file Regression test ensuring port hover/leave does not re-render unrelated nodes.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import type { NodeViewProps } from "../src/components/node/NodeView";
import { NodeViewContainer } from "../src/components/node/NodeViewContainer";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import type { NodeEditorData } from "../src/types/core";
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
      type: "standard",
      position: { x: index * 260, y: 0 },
      size: { width: 220, height: 96 },
      data: { title: id, content: "" },
    };
  });
  return { nodes, connections: {} };
};

describe("port hover/leave node render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit unrelated nodes on port hover leave", async () => {
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
      <NodeEditorCore
        initialData={initialData}
        nodeDefinitions={[asNodeDefinition(StandardNodeDefinition)]}
        renderers={{ node: CountingNode }}
      >
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const hoveredNodeId = "n0";
    const portEl = container.querySelector(`[data-node-id="${hoveredNodeId}"][data-port-id="output"]`) as
      | HTMLElement
      | null;
    expect(portEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerEnter(portEl!, { pointerId: 1, pointerType: "mouse" });
    });
    await nextFrame();

    const beforeLeave = counter.snapshot();

    await act(async () => {
      fireEvent.pointerLeave(portEl!, { pointerId: 1, pointerType: "mouse" });
    });
    await nextFrame();

    const afterLeave = counter.snapshot();

    const nonHoveredDeltas = Object.entries(beforeLeave)
      .filter(([id]) => id !== hoveredNodeId)
      .map(([id, before]) => (afterLeave[id] ?? 0) - before);

    const maxNonHoveredDelta = Math.max(...nonHoveredDeltas);
    if (maxNonHoveredDelta > 0) {
      const offenders = Object.entries(beforeLeave)
        .filter(([id]) => id !== hoveredNodeId)
        .map(([id, before]) => ({ id, delta: (afterLeave[id] ?? 0) - before }))
        .filter((entry) => entry.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 6);
      throw new Error(`unrelated node commits detected on port leave: ${JSON.stringify(offenders)}`);
    }
    expect(maxNonHoveredDelta).toBeLessThanOrEqual(0);
  });
});
