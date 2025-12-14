/**
 * @file Node editor reducer
 * Handles all state transitions for the node editor including node/connection CRUD,
 * group operations, clipboard operations, and layout triggers
 */
import type { Node, NodeEditorData, NodeId } from "../../../types/core";
import { nodeEditorActions, type NodeEditorAction } from "./actions";
import type { NodeDefinition } from "../../../types/NodeDefinition";
import { nodeHasGroupBehavior } from "../../../types/behaviors";
import { copyNodesToClipboard, pasteNodesFromClipboard } from "./utils/nodeClipboardOperations";
import { pruneInvalidConnections } from "./utils/connectionPruning";
import { createActionHandlerMap } from "../../../utils/typedActions";

const nodeEditorHandlers = createActionHandlerMap<NodeEditorData, typeof nodeEditorActions, NodeDefinition[]>(
  nodeEditorActions,
  {
    addNode: (state, action) => {
      const id = generateId();
      const node = { ...action.payload.node, id } as Node;
      return { ...state, nodes: { ...state.nodes, [id]: node } };
    },
    addNodeWithId: (state, action) => {
      const node = action.payload.node as Node;
      return { ...state, nodes: { ...state.nodes, [node.id]: node } };
    },
    updateNode: (state, action, nodeDefinitions) => {
      const { nodeId, updates } = action.payload;
      const node = state.nodes[nodeId];
      if (!node) {
        return state;
      }
      const nextNodes = { ...state.nodes, [nodeId]: { ...node, ...updates } as Node };

      const propagateVisibility = Object.prototype.hasOwnProperty.call(updates, "visible");
      const propagateLock = Object.prototype.hasOwnProperty.call(updates, "locked");
      if ((propagateVisibility || propagateLock) && nodeHasGroupBehavior(node, nodeDefinitions)) {
        const targetVisible = propagateVisibility ? updates.visible : undefined;
        const targetLocked = propagateLock ? updates.locked : undefined;

        if (typeof targetVisible !== "undefined" || typeof targetLocked !== "undefined") {
          const isDescendant = (childId: NodeId, ancestorId: NodeId): boolean => {
            const descendant = nextNodes[childId];
            if (!descendant) {
              return false;
            }
            if (descendant.parentId === ancestorId) {
              return true;
            }
            if (descendant.parentId) {
              return isDescendant(descendant.parentId, ancestorId);
            }
            return false;
          };

          Object.values(nextNodes).forEach((candidate) => {
            if (candidate.id !== nodeId && isDescendant(candidate.id, nodeId)) {
              nextNodes[candidate.id] = {
                ...candidate,
                ...(typeof targetVisible !== "undefined" ? { visible: targetVisible } : {}),
                ...(typeof targetLocked !== "undefined" ? { locked: targetLocked } : {}),
              };
            }
          });
        }
      }

      return { ...state, nodes: nextNodes };
    },
    deleteNode: (state, action) => {
      const { nodeId } = action.payload;
      const { [nodeId]: _deleted, ...remainingNodes } = state.nodes;
      const remainingConnections = Object.entries(state.connections).reduce(
        (acc, [connId, conn]) => {
          if (conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId) {
            acc[connId] = conn;
          }
          return acc;
        },
        {} as typeof state.connections,
      );
      return { ...state, nodes: remainingNodes, connections: remainingConnections };
    },
    moveNode: (state, action) => {
      const { nodeId, position } = action.payload;
      const node = state.nodes[nodeId];
      if (!node) {
        return state;
      }
      return { ...state, nodes: { ...state.nodes, [nodeId]: { ...node, position } } };
    },
    moveNodes: (state, action) => {
      const { updates } = action.payload;
      const updatedNodes = { ...state.nodes };
      Object.entries(updates).forEach(([nodeId, position]) => {
        const node = updatedNodes[nodeId];
        if (node) {
          updatedNodes[nodeId] = { ...node, position };
        }
      });
      return { ...state, nodes: updatedNodes };
    },
    addConnection: (state, action) => {
      const { connection } = action.payload;
      const id = generateId();
      return { ...state, connections: { ...state.connections, [id]: { ...connection, id } } };
    },
    deleteConnection: (state, action) => {
      const { connectionId } = action.payload;
      const { [connectionId]: _deleted, ...remaining } = state.connections;
      return { ...state, connections: remaining };
    },
    setNodeData: (_state, action) => action.payload.data,
    restoreState: (_state, action) => action.payload.data,
    duplicateNodes: (state, action, nodeDefinitions) => {
      const { nodeIds } = action.payload;
      if (nodeIds.length === 0) {
        return state;
      }
      const newNodes: Record<NodeId, Node> = { ...state.nodes };
      const duplicatedNodeIds: NodeId[] = [];
      nodeIds.forEach((oldId) => {
        const originalNode = state.nodes[oldId];
        if (!originalNode) {
          return;
        }
        const newId = generateId();
        duplicatedNodeIds.push(newId);
        const duplicatedNode: Node = {
          ...originalNode,
          id: newId,
          position: { x: originalNode.position.x + 50, y: originalNode.position.y + 50 },
          data: {
            ...originalNode.data,
            title: originalNode.data.title ? `${originalNode.data.title} Copy` : `Node Copy`,
            createdAt: Date.now(),
          },
        };
        if (nodeHasGroupBehavior(duplicatedNode, nodeDefinitions)) {
          duplicatedNode.children = [];
        }
        newNodes[newId] = duplicatedNode;
      });
      return { ...state, nodes: newNodes, lastDuplicatedNodeIds: duplicatedNodeIds };
    },
    groupNodes: (state, action) => {
      const { nodeIds, groupId = generateId() } = action.payload;
      if (nodeIds.length === 0) {
        return state;
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      nodeIds.forEach((id) => {
        const node = state.nodes[id];
        if (node) {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + (node.size?.width || 100));
          maxY = Math.max(maxY, node.position.y + (node.size?.height || 50));
        }
      });
      const groupNode: Node = {
        id: groupId,
        type: "group",
        position: { x: minX - 20, y: minY - 40 },
        size: { width: maxX - minX + 40, height: maxY - minY + 60 },
        data: { title: "Group" },
        children: nodeIds,
        expanded: true,
      };
      return { ...state, nodes: { ...state.nodes, [groupId]: groupNode } };
    },
    ungroupNode: (state, action, nodeDefinitions) => {
      const { groupId } = action.payload;
      const group = state.nodes[groupId];
      if (!group || !nodeHasGroupBehavior(group, nodeDefinitions)) {
        return state;
      }
      const { [groupId]: _deleted, ...remainingNodes } = state.nodes;
      return { ...state, nodes: remainingNodes };
    },
    updateGroupMembership: (state, action) => {
      const { updates } = action.payload;
      const updatedNodes = { ...state.nodes };
      Object.entries(updates).forEach(([nodeId, update]) => {
        const node = updatedNodes[nodeId];
        if (node) {
          updatedNodes[nodeId] = { ...node, ...update } as Node;
        }
      });
      return { ...state, nodes: updatedNodes };
    },
    moveGroupWithChildren: (state, action) => {
      const { groupId: _groupId, delta, affectedNodeIds } = action.payload;
      const updatedNodes = { ...state.nodes };
      affectedNodeIds.forEach((nodeId) => {
        const node = updatedNodes[nodeId];
        if (!node) {
          return;
        }
        updatedNodes[nodeId] = {
          ...node,
          position: { x: node.position.x + delta.x, y: node.position.y + delta.y },
        };
      });
      return { ...state, nodes: updatedNodes };
    },
    autoLayout: (state) => state,
    pruneInvalidConnections: (state, _action, nodeDefinitions) => {
      const result = pruneInvalidConnections(state, nodeDefinitions);
      return result.data;
    },
    copyNodes: (state, action) => {
      const { nodeIds } = action.payload;
      copyNodesToClipboard(nodeIds, state);
      return state;
    },
    pasteNodes: (state, action) => {
      const { offsetX = 40, offsetY = 40 } = action.payload;
      const pasteResult = pasteNodesFromClipboard(offsetX, offsetY);
      if (!pasteResult) {
        return state;
      }
      const newNodes = { ...state.nodes };
      const newConnections = { ...state.connections };
      pasteResult.nodes.forEach((node) => {
        newNodes[node.id] = node as Node;
      });
      pasteResult.connections.forEach((conn) => {
        const id = generateId();
        newConnections[id] = { ...conn, id };
      });
      return {
        ...state,
        nodes: newNodes,
        connections: newConnections,
      };
    },
  },
);

export const nodeEditorReducer = (
  state: NodeEditorData,
  action: NodeEditorAction,
  nodeDefinitions: NodeDefinition[] = [],
): NodeEditorData => {
  const handler = nodeEditorHandlers[action.type];
  if (!handler) {
    return state;
  }
  return handler(state, action, nodeDefinitions);
};

export const defaultNodeEditorData: NodeEditorData = { nodes: {}, connections: {} };

/**
 * Generates a unique random identifier string
 * @returns A random 8-character alphanumeric string
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type { NodeEditorData };
