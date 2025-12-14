/**
 * @file Drag state store for NodeTree DnD
 *
 * Keeps drag hover updates out of React component state so only affected items update.
 */
import * as React from "react";
import type { NodeId } from "../../../types/core";

export type NodeTreeDragState = {
  draggingNodeId: NodeId | null;
  dragOverNodeId: NodeId | null;
  dragOverPosition: "before" | "inside" | "after" | null;
};

export type NodeTreeDragNodeSnapshot = {
  isDragging: boolean;
  isDragOverInside: boolean;
  dragOverPositionAttr: "before" | "after" | undefined;
};

export type NodeTreeDragStateStore = {
  getState: () => NodeTreeDragState;
  setState: (partial: Partial<NodeTreeDragState>) => void;
  subscribeNode: (nodeId: NodeId, listener: () => void) => () => void;
  getNodeSnapshot: (nodeId: NodeId) => NodeTreeDragNodeSnapshot;
};

const getDragNodeSnapshot = (state: NodeTreeDragState, nodeId: NodeId): NodeTreeDragNodeSnapshot => {
  const isDragging = state.draggingNodeId === nodeId;
  const isDragOver = state.dragOverNodeId === nodeId;
  const isDragOverInside = isDragOver && state.dragOverPosition === "inside";
  const dragOverPositionAttr =
    isDragOver && (state.dragOverPosition === "before" || state.dragOverPosition === "after")
      ? state.dragOverPosition
      : undefined;

  return { isDragging, isDragOverInside, dragOverPositionAttr };
};

export const createNodeTreeDragStateStore = (): NodeTreeDragStateStore => {
  let state: NodeTreeDragState = {
    draggingNodeId: null,
    dragOverNodeId: null,
    dragOverPosition: null,
  };

  const listenersByNodeId = new Map<NodeId, Set<() => void>>();
  const snapshotByNodeId = new Map<NodeId, NodeTreeDragNodeSnapshot>();

  const notifyNode = (nodeId: NodeId) => {
    const listeners = listenersByNodeId.get(nodeId);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener();
    }
  };

  const getState = () => state;

  const getOrCreateSnapshot = (nodeId: NodeId): NodeTreeDragNodeSnapshot => {
    const cached = snapshotByNodeId.get(nodeId);
    if (cached) {
      return cached;
    }
    const snapshot = getDragNodeSnapshot(state, nodeId);
    snapshotByNodeId.set(nodeId, snapshot);
    return snapshot;
  };

  const setState = (partial: Partial<NodeTreeDragState>) => {
    const prev = state;
    const next: NodeTreeDragState = { ...prev, ...partial };
    if (
      prev.draggingNodeId === next.draggingNodeId &&
      prev.dragOverNodeId === next.dragOverNodeId &&
      prev.dragOverPosition === next.dragOverPosition
    ) {
      return;
    }

    state = next;

    const affectedNodeIds = new Set<NodeId>();

    if (prev.draggingNodeId !== next.draggingNodeId) {
      if (prev.draggingNodeId) {
        affectedNodeIds.add(prev.draggingNodeId);
      }
      if (next.draggingNodeId) {
        affectedNodeIds.add(next.draggingNodeId);
      }
    }

    if (prev.dragOverNodeId !== next.dragOverNodeId) {
      if (prev.dragOverNodeId) {
        affectedNodeIds.add(prev.dragOverNodeId);
      }
      if (next.dragOverNodeId) {
        affectedNodeIds.add(next.dragOverNodeId);
      }
    } else if (prev.dragOverPosition !== next.dragOverPosition && next.dragOverNodeId) {
      affectedNodeIds.add(next.dragOverNodeId);
    }

    for (const nodeId of affectedNodeIds) {
      const prevSnapshot = getOrCreateSnapshot(nodeId);
      const nextSnapshot = getDragNodeSnapshot(state, nodeId);
      if (
        prevSnapshot.isDragging !== nextSnapshot.isDragging ||
        prevSnapshot.isDragOverInside !== nextSnapshot.isDragOverInside ||
        prevSnapshot.dragOverPositionAttr !== nextSnapshot.dragOverPositionAttr
      ) {
        snapshotByNodeId.set(nodeId, nextSnapshot);
        notifyNode(nodeId);
      }
    }
  };

  const subscribeNode = (nodeId: NodeId, listener: () => void) => {
    const existing = listenersByNodeId.get(nodeId);
    if (existing) {
      existing.add(listener);
    } else {
      listenersByNodeId.set(nodeId, new Set([listener]));
    }

    return () => {
      const current = listenersByNodeId.get(nodeId);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        listenersByNodeId.delete(nodeId);
      }
    };
  };

  const getNodeSnapshot = (nodeId: NodeId) => getOrCreateSnapshot(nodeId);

  return {
    getState,
    setState,
    subscribeNode,
    getNodeSnapshot,
  };
};

export const NodeTreeDragStateContext = React.createContext<NodeTreeDragStateStore | null>(null);

export const useNodeTreeDragStateStore = (): NodeTreeDragStateStore => {
  const store = React.useContext(NodeTreeDragStateContext);
  if (!store) {
    throw new Error("useNodeTreeDragStateStore must be used within a NodeTreeDragStateContext.Provider");
  }
  return store;
};

export const useNodeTreeDragNodeSnapshot = (nodeId: NodeId): NodeTreeDragNodeSnapshot => {
  const store = useNodeTreeDragStateStore();
  return React.useSyncExternalStore(
    (listener) => store.subscribeNode(nodeId, listener),
    () => store.getNodeSnapshot(nodeId),
    () => store.getNodeSnapshot(nodeId),
  );
};
