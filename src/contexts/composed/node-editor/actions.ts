/**
 * @file Action type definitions and action creator functions for node editor state management
 */
import type { Connection, ConnectionId, Node, NodeEditorData, NodeId, Position } from "../../../types/core";
import { createAction, type ActionUnion } from "../../../utils/typedActions";

export const nodeEditorActions = {
  addNode: createAction("ADD_NODE", (node: Omit<Node, "id">) => ({ node })),
  addNodeWithId: createAction("ADD_NODE_WITH_ID", (node: Node) => ({ node })),
  updateNode: createAction("UPDATE_NODE", (nodeId: NodeId, updates: Partial<Node>) => ({ nodeId, updates })),
  deleteNode: createAction("DELETE_NODE", (nodeId: NodeId) => ({ nodeId })),
  moveNode: createAction("MOVE_NODE", (nodeId: NodeId, position: Position) => ({ nodeId, position })),
  moveNodes: createAction("MOVE_NODES", (updates: Record<NodeId, Position>) => ({ updates })),
  addConnection: createAction(
    "ADD_CONNECTION",
    (connection: Omit<Connection, "id">, options?: { allowMultiToPort?: boolean }) => ({
      connection,
      allowMultiToPort: options?.allowMultiToPort,
    }),
  ),
  deleteConnection: createAction("DELETE_CONNECTION", (connectionId: ConnectionId) => ({ connectionId })),
  setNodeData: createAction("SET_NODE_DATA", (data: NodeEditorData) => ({ data })),
  restoreState: createAction("RESTORE_STATE", (data: NodeEditorData) => ({ data })),
  duplicateNodes: createAction("DUPLICATE_NODES", (nodeIds: NodeId[]) => ({ nodeIds })),
  groupNodes: createAction("GROUP_NODES", (nodeIds: NodeId[], groupId?: NodeId) => ({ nodeIds, groupId })),
  ungroupNode: createAction("UNGROUP_NODE", (groupId: NodeId) => ({ groupId })),
  updateGroupMembership: createAction(
    "UPDATE_GROUP_MEMBERSHIP",
    (updates: Record<NodeId, { parentId?: NodeId }>) => ({ updates }),
  ),
  moveGroupWithChildren: createAction(
    "MOVE_GROUP_WITH_CHILDREN",
    (groupId: NodeId, delta: { x: number; y: number }, affectedNodeIds: NodeId[]) => ({ groupId, delta, affectedNodeIds }),
  ),
  autoLayout: createAction(
    "AUTO_LAYOUT",
    (layoutType: "force" | "hierarchical" | "grid", selectedOnly?: boolean) => ({ layoutType, selectedOnly }),
  ),
  copyNodes: createAction("COPY_NODES", (nodeIds: NodeId[]) => ({ nodeIds })),
  pasteNodes: createAction("PASTE_NODES", (offsetX?: number, offsetY?: number) => ({ offsetX, offsetY })),
  pruneInvalidConnections: createAction("PRUNE_INVALID_CONNECTIONS", () => ({})),
} as const;

export type NodeEditorAction = ActionUnion<typeof nodeEditorActions>;

export type { NodeEditorData };
