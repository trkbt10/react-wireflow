/**
 * @file Hook for calculating which nodes are visible in the current viewport
 */
import * as React from "react";
import type { Node, NodeId } from "../../../../../types/core";
import { useNodeCanvasApi } from "../context";
import { useRafThrottledCallback } from "../../../../../hooks/useRafThrottledCallback";
import { useNodeEditorApi } from "../../../node-editor/context";

type ViewportBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const areVisibleNodeIdListsEqual = (a: readonly NodeId[], b: readonly NodeId[]): boolean => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const computeVisibleNodeIds = (
  nodes: readonly Node[],
  viewport: { offset: { x: number; y: number }; scale: number },
  viewBox: { width: number; height: number },
  bufferFactor: number,
): NodeId[] => {
  const containerWidth = viewBox.width > 0 ? viewBox.width : (typeof window !== "undefined" ? window.innerWidth : 0);
  const containerHeight = viewBox.height > 0 ? viewBox.height : (typeof window !== "undefined" ? window.innerHeight : 0);

  const buffer = (Math.max(containerWidth, containerHeight) * (bufferFactor - 1)) / 2;
  const bounds: ViewportBounds = {
    left: (-viewport.offset.x - buffer) / viewport.scale,
    top: (-viewport.offset.y - buffer) / viewport.scale,
    right: (containerWidth - viewport.offset.x + buffer) / viewport.scale,
    bottom: (containerHeight - viewport.offset.y + buffer) / viewport.scale,
  };

  const visible: NodeId[] = [];
  nodes.forEach((node) => {
    if (node.visible === false) {
      return;
    }
    const nodeWidth = node.size?.width || 150;
    const nodeHeight = node.size?.height || 50;
    const isVisible =
      node.position.x + nodeWidth >= bounds.left &&
      node.position.x <= bounds.right &&
      node.position.y + nodeHeight >= bounds.top &&
      node.position.y <= bounds.bottom
    ;
    if (isVisible) {
      visible.push(node.id);
    }
  });
  return visible;
};

/**
 * Hook to calculate which nodes are visible in the current viewport
 * Adds a buffer zone to prevent nodes from popping in/out during pan
 */
export const useVisibleNodes = (nodeIds: readonly NodeId[], bufferFactor: number = 1.5): NodeId[] => {
  const { store } = useNodeCanvasApi();
  const { getState: getNodeEditorState, subscribeToChanges } = useNodeEditorApi();
  const nodeIdsRef = React.useRef(nodeIds);
  nodeIdsRef.current = nodeIds;

  const bufferFactorRef = React.useRef(bufferFactor);
  bufferFactorRef.current = bufferFactor;

  const [visibleNodeIds, setVisibleNodeIds] = React.useState<NodeId[]>(() => {
    const state = store.getState();
    const nodes = nodeIds.map((nodeId) => getNodeEditorState().nodes[nodeId]).filter(Boolean) as Node[];
    return computeVisibleNodeIds(nodes, state.viewport, state.viewBox, bufferFactor);
  });

  const visibleNodeIdsRef = React.useRef<NodeId[]>(visibleNodeIds);
  visibleNodeIdsRef.current = visibleNodeIds;

  const updateVisibleNodes = React.useEffectEvent(() => {
    const state = store.getState();
    const nodes = nodeIdsRef.current
      .map((nodeId) => getNodeEditorState().nodes[nodeId])
      .filter(Boolean) as Node[];
    const computed = computeVisibleNodeIds(nodes, state.viewport, state.viewBox, bufferFactorRef.current);
    if (areVisibleNodeIdListsEqual(visibleNodeIdsRef.current, computed)) {
      return;
    }
    visibleNodeIdsRef.current = computed;
    setVisibleNodeIds(computed);
  });

  const { schedule, cancel } = useRafThrottledCallback<void>(() => {
    updateVisibleNodes();
  });

  React.useEffect(() => {
    updateVisibleNodes();
  }, [nodeIds, bufferFactor]);

  React.useLayoutEffect(() => {
    const unsubscribeCanvas = store.subscribe(() => {
      schedule(undefined);
    });

    const unsubscribeEditor = subscribeToChanges((change) => {
      if (change.affectsGeometry || change.fullResync) {
        schedule(undefined);
      }
    });

    return () => {
      unsubscribeCanvas();
      unsubscribeEditor();
    };
  }, [store, schedule, subscribeToChanges]);

  React.useEffect(() => cancel, [cancel]);

  return visibleNodeIdsRef.current;
};
