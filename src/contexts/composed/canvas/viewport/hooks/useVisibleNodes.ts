/**
 * @file Hook for calculating which nodes are visible in the current viewport
 */
import * as React from "react";
import type { Node } from "../../../../../types/core";
import { useNodeCanvasApi } from "../context";
import { useRafThrottledCallback } from "../../../../../hooks/useRafThrottledCallback";

type ViewportBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const areVisibleNodeListsEqual = (a: readonly Node[], b: readonly Node[]): boolean => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) {
      return false;
    }
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const computeVisibleNodes = (
  nodes: readonly Node[],
  viewport: { offset: { x: number; y: number }; scale: number },
  viewBox: { width: number; height: number },
  bufferFactor: number,
): Node[] => {
  const containerWidth = viewBox.width > 0 ? viewBox.width : (typeof window !== "undefined" ? window.innerWidth : 0);
  const containerHeight = viewBox.height > 0 ? viewBox.height : (typeof window !== "undefined" ? window.innerHeight : 0);

  const buffer = (Math.max(containerWidth, containerHeight) * (bufferFactor - 1)) / 2;
  const bounds: ViewportBounds = {
    left: (-viewport.offset.x - buffer) / viewport.scale,
    top: (-viewport.offset.y - buffer) / viewport.scale,
    right: (containerWidth - viewport.offset.x + buffer) / viewport.scale,
    bottom: (containerHeight - viewport.offset.y + buffer) / viewport.scale,
  };

  return nodes.filter((node) => {
    if (node.visible === false) {
      return false;
    }
    const nodeWidth = node.size?.width || 150;
    const nodeHeight = node.size?.height || 50;
    return (
      node.position.x + nodeWidth >= bounds.left &&
      node.position.x <= bounds.right &&
      node.position.y + nodeHeight >= bounds.top &&
      node.position.y <= bounds.bottom
    );
  });
};

/**
 * Hook to calculate which nodes are visible in the current viewport
 * Adds a buffer zone to prevent nodes from popping in/out during pan
 */
export const useVisibleNodes = (nodes: readonly Node[], bufferFactor: number = 1.5): Node[] => {
  const { store } = useNodeCanvasApi();
  const nodesRef = React.useRef(nodes);
  nodesRef.current = nodes;

  const bufferFactorRef = React.useRef(bufferFactor);
  bufferFactorRef.current = bufferFactor;

  const [visibleNodes, setVisibleNodes] = React.useState<Node[]>(() => {
    const state = store.getState();
    return computeVisibleNodes(nodes, state.viewport, state.viewBox, bufferFactor);
  });

  const visibleNodesRef = React.useRef<Node[]>(visibleNodes);
  visibleNodesRef.current = visibleNodes;

  const updateVisibleNodes = React.useEffectEvent(() => {
    const state = store.getState();
    const computed = computeVisibleNodes(nodesRef.current, state.viewport, state.viewBox, bufferFactorRef.current);
    if (areVisibleNodeListsEqual(visibleNodesRef.current, computed)) {
      return;
    }
    visibleNodesRef.current = computed;
    setVisibleNodes(computed);
  });

  const { schedule, cancel } = useRafThrottledCallback<void>(() => {
    updateVisibleNodes();
  });

  React.useEffect(() => {
    updateVisibleNodes();
  }, [nodes, bufferFactor]);

  React.useLayoutEffect(() => {
    return store.subscribe(() => {
      schedule(undefined);
    });
  }, [store, schedule]);

  React.useEffect(() => cancel, [cancel]);

  return visibleNodesRef.current;
};
