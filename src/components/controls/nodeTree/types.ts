/**
 * @file Shared types for NodeTreeListPanel components
 */
import type { Node, NodeId } from "../../../types/core";

export type NodeTreeNode = Pick<Node, "id" | "type" | "data" | "locked" | "visible" | "expanded" | "order" | "parentId">;

export type NodeTreeItemProps = {
  node: NodeTreeNode;
  level: number;
  isSelected: boolean;
  onSelect: (nodeId: NodeId, multiSelect: boolean) => void;
  onToggleVisibility?: (nodeId: NodeId) => void;
  onToggleLock?: (nodeId: NodeId) => void;
  onToggleExpand?: (nodeId: NodeId) => void;
  onDeleteNode?: (nodeId: NodeId) => void;
  onUpdateTitle?: (nodeId: NodeId, title: string) => void;
  childNodeIds: readonly NodeId[];
  onNodeDrop: (draggedNodeId: NodeId, targetNodeId: NodeId, position: "before" | "inside" | "after") => void;
};

export type ConnectedNodeTreeItemProps = {
  nodeId: NodeId;
  level: number;
  onNodeDrop: (draggedNodeId: NodeId, targetNodeId: NodeId, position: "before" | "inside" | "after") => void;
};
