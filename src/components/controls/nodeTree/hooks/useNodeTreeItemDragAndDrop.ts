/**
 * @file DnD behavior for NodeTreeItem
 */
import * as React from "react";
import type { NodeId } from "../../../../types/core";
import type { NodeTreeDragStateStore } from "../dragStateStore";

export type DragOverPosition = "before" | "inside" | "after";

const getDragOverPosition = (params: { isGroup: boolean; y: number; height: number }): DragOverPosition => {
  const { isGroup, y, height } = params;

  if (isGroup && y > height * 0.25 && y < height * 0.75) {
    return "inside";
  }

  if (y < height / 2) {
    return "before";
  }

  return "after";
};

export type UseNodeTreeItemDragAndDropParams = {
  nodeId: NodeId;
  isGroup: boolean;
  isDraggingTextRef: React.RefObject<boolean>;
  onNodeDrop: (draggedNodeId: NodeId, targetNodeId: NodeId, position: DragOverPosition) => void;
  dragStateStore: NodeTreeDragStateStore;
};

export type UseNodeTreeItemDragAndDropResult = {
  handleDragStart: (e: React.DragEvent) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
};

export const useNodeTreeItemDragAndDrop = (params: UseNodeTreeItemDragAndDropParams): UseNodeTreeItemDragAndDropResult => {
  const { nodeId, isGroup, isDraggingTextRef, dragStateStore, onNodeDrop } = params;

  const handleDragStart = React.useEffectEvent((e: React.DragEvent) => {
    if (isDraggingTextRef.current) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("nodeId", nodeId);
    dragStateStore.setState({ draggingNodeId: nodeId });
  });

  const handleDragEnd = React.useEffectEvent(() => {
    dragStateStore.setState({
      draggingNodeId: null,
      dragOverNodeId: null,
      dragOverPosition: null,
    });
  });

  const handleDragOver = React.useEffectEvent((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDragState = dragStateStore.getState();
    if (currentDragState.draggingNodeId === nodeId) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const position = getDragOverPosition({ isGroup, y, height });

    if (currentDragState.dragOverNodeId !== nodeId || currentDragState.dragOverPosition !== position) {
      dragStateStore.setState({
        dragOverNodeId: nodeId,
        dragOverPosition: position,
      });
    }
  });

  const handleDragLeave = React.useEffectEvent((e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      const currentDragState = dragStateStore.getState();
      if (currentDragState.dragOverNodeId === nodeId) {
        dragStateStore.setState({
          dragOverNodeId: null,
          dragOverPosition: null,
        });
      }
    }
  });

  const handleDrop = React.useEffectEvent((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedNodeId = e.dataTransfer.getData("nodeId");
    const currentDragState = dragStateStore.getState();
    if (draggedNodeId && currentDragState.dragOverPosition) {
      onNodeDrop(draggedNodeId, nodeId, currentDragState.dragOverPosition);
    }

    dragStateStore.setState({
      draggingNodeId: null,
      dragOverNodeId: null,
      dragOverPosition: null,
    });
  });

  return {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
