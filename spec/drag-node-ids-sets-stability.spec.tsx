/**
 * @file Regression test ensuring derived drag node ID Sets stay stable across drag offset updates.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import type { NodeId, Position } from "../src/types/core";
import {
  useCanvasInteractionActions,
  useDragNodeIdsSets,
  type DragNodeIdsSets,
} from "../src/contexts/composed/canvas/interaction/context";

type Captured = {
  actions: ReturnType<typeof useCanvasInteractionActions>["actions"] | null;
  snapshots: (DragNodeIdsSets | null)[];
};

const Capture: React.FC<{ captured: Captured }> = ({ captured }) => {
  const { actions } = useCanvasInteractionActions();
  const sets = useDragNodeIdsSets();

  React.useEffect(() => {
    captured.actions = actions;
  }, [actions, captured]);

  React.useEffect(() => {
    captured.snapshots.push(sets);
  }, [sets, captured]);

  return null;
};

describe("useDragNodeIdsSets stability", () => {
  it("does not change Set identities during drag offset updates", async () => {
    const captured: Captured = { actions: null, snapshots: [] };

    render(
      <NodeEditorCore initialData={{ nodes: {}, connections: {} }}>
        <Capture captured={captured} />
      </NodeEditorCore>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(captured.actions).not.toBeNull();
    const actions = captured.actions!;

    const nodeIds: NodeId[] = ["a"];
    const startPosition: Position = { x: 0, y: 0 };
    const initialPositions: Record<NodeId, Position> = { a: { x: 0, y: 0 } };
    const affectedChildNodes: Record<NodeId, NodeId[]> = {};

    await act(async () => {
      actions.startNodeDrag(nodeIds, startPosition, initialPositions, affectedChildNodes);
    });

    const firstNonNull = captured.snapshots.find((s) => s !== null) ?? null;
    expect(firstNonNull).not.toBeNull();

    const reference = firstNonNull!;

    await act(async () => {
      for (const step of [1, 2, 3, 4, 5, 6, 7]) {
        actions.updateNodeDrag({ x: step, y: step });
      }
    });

    const nonNullSnapshots = captured.snapshots.filter((s): s is DragNodeIdsSets => s !== null);
    expect(nonNullSnapshots.length).toBeGreaterThan(0);

    const last = nonNullSnapshots[nonNullSnapshots.length - 1];
    expect(last).toBe(reference);
    expect(last.directlyDraggedNodeIds).toBe(reference.directlyDraggedNodeIds);
    expect(last.affectedChildNodeIds).toBe(reference.affectedChildNodeIds);
    expect(last.allDraggedNodeIds).toBe(reference.allDraggedNodeIds);
  });
});

