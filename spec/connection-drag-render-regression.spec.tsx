/**
 * @file Render-regression test ensuring connection drag pointer-move does not commit all nodes.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import type { NodeViewProps } from "../src/components/node/NodeView";
import { NodeViewContainer } from "../src/components/node/NodeViewContainer";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import type { NodeEditorData } from "../src/types/core";
import type { NodeDefinition } from "../src/types/NodeDefinition";

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
      type: "portNode",
      position: { x: index * 240, y: 0 },
      size: { width: 220, height: 72 },
      data: { title: id, labelTitle: id },
    };
  });
  return { nodes, connections: {} };
};

const portNodeDefinition: NodeDefinition = {
  type: "portNode",
  displayName: "Port Node",
  ports: [
    { id: "out", type: "output", label: "Out", position: "right" },
    { id: "in", type: "input", label: "In", position: "left" },
  ],
};

describe("connection drag render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit nodes during connection drag pointer move", async () => {
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
      <NodeEditorCore initialData={initialData} nodeDefinitions={[portNodeDefinition]} renderers={{ node: CountingNode }}>
        <NodeCanvas />
      </NodeEditorCore>,
    );

    await nextFrame();

    const fromNodeId = "n0";
    const portEl = container.querySelector(
      `[data-node-id="${fromNodeId}"][data-port-id="out"]`,
    ) as HTMLElement | null;
    expect(portEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(portEl!, {
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
          clientX: 10 + step * 40,
          clientY: 40,
        });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    });

    const afterMoves = counter.snapshot();

    const deltas = Object.entries(afterDown).map(([id, countAfterDown]) => (afterMoves[id] ?? 0) - countAfterDown);
    const maxDelta = Math.max(...deltas);
    expect(maxDelta).toBeLessThanOrEqual(1);

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 200,
        clientY: 40,
      });
    });
  });
});
