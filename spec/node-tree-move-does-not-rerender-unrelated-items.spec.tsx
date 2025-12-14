/**
 * @file Regression test ensuring inspector node-tree items do not commit on unrelated node moves.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import type { NodeEditorApiValue } from "../src/contexts/composed/node-editor/context";
import { useNodeEditorApi } from "../src/contexts/composed/node-editor/context";
import { ConnectedNodeTreeItem } from "../src/components/controls/nodeTree/ConnectedNodeTreeItem";
import { NodeTreeDragStateContext, createNodeTreeDragStateStore } from "../src/components/controls/nodeTree/dragStateStore";
import type { NodeEditorData, NodeId } from "../src/types/core";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

type CommitCounts = Record<string, number>;

const createCommitCounter = () => {
  const counts: CommitCounts = {};
  return {
    inc: (id: string) => {
      counts[id] = (counts[id] ?? 0) + 1;
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
      position: { x: index * 120, y: 0 },
      size: { width: 220, height: 72 },
      data: { title: id, labelTitle: id },
    };
  });
  return { nodes, connections: {} };
};

const NodeEditorApiProbe: React.FC<{ onReady: (api: NodeEditorApiValue) => void }> = ({ onReady }) => {
  const api = useNodeEditorApi();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
};

describe("inspector node-tree move render regression", () => {
  it("does not commit node-tree items on MOVE_NODES", async () => {
    const counter = createCommitCounter();
    const apiRef: { current: NodeEditorApiValue | null } = { current: null };
    const onReady = (api: NodeEditorApiValue) => {
      apiRef.current = api;
    };

    const nodeCount = 40;
    const nodeIds: NodeId[] = Array.from({ length: nodeCount }).map((_, idx) => `n${idx}`);

    const dragStateStore = createNodeTreeDragStateStore();
    const Harness: React.FC = () => {
      const onNodeDrop = React.useCallback(
        (_draggedNodeId: NodeId, _targetNodeId: NodeId, _position: "before" | "inside" | "after") => undefined,
        [],
      );
      return (
        <NodeTreeDragStateContext.Provider value={dragStateStore}>
          {nodeIds.map((nodeId) => (
            <React.Profiler
              key={nodeId}
              id={`tree-item-${nodeId}`}
              onRender={() => {
                counter.inc(nodeId);
              }}
            >
              <ConnectedNodeTreeItem nodeId={nodeId} level={0} onNodeDrop={onNodeDrop} />
            </React.Profiler>
          ))}
        </NodeTreeDragStateContext.Provider>
      );
    };

    render(
      <NodeEditorCore initialData={createInitialData(nodeCount)}>
        <NodeEditorApiProbe onReady={onReady} />
        <Harness />
      </NodeEditorCore>,
    );

    await nextFrame();

    const api = apiRef.current;
    expect(api).not.toBeNull();
    if (!api) {
      throw new Error("node editor api not ready");
    }

    const baseline = counter.snapshot();

    await act(async () => {
      api.actions.moveNodes({ n0: { x: 999, y: 123 } });
    });
    await nextFrame();

    const moved = api.getState().nodes.n0;
    expect(moved?.position.x).toBe(999);
    expect(moved?.position.y).toBe(123);

    const after = counter.snapshot();
    const deltas = nodeIds.map((id) => (after[id] ?? 0) - (baseline[id] ?? 0));
    const maxDelta = Math.max(...deltas);
    if (maxDelta > 0) {
      const offenders = nodeIds
        .map((id) => ({ id, delta: (after[id] ?? 0) - (baseline[id] ?? 0) }))
        .filter((entry) => entry.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 8);
      throw new Error(`node-tree commits detected after move: ${JSON.stringify(offenders)}`);
    }
    expect(maxDelta).toBeLessThanOrEqual(0);
  });
});

