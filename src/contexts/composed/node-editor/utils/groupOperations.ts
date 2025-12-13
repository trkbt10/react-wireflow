/**
 * @file Group node operations and utilities
 * Provides functions for managing group nodes, membership, bounds calculation,
 * and auto-grouping behavior in the node editor
 */
import type { Node, NodeId } from "../../../../types/core";
import type { NodeDefinition } from "../../../../types/NodeDefinition";
import {
  getNodeBoundingBox,
  doRectanglesIntersect,
  isRectangleInsideAnother,
  type BoundingBox,
} from "../../../../utils/boundingBoxUtils";
import { createParentToChildrenMap } from "./nodeLookupUtils";
import { nodeHasGroupBehavior, getGroupBehaviorOptions } from "../../../../types/behaviors";

// Keep GroupBounds for backwards compatibility
export type GroupBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Convert BoundingBox to GroupBounds for backwards compatibility
 */
function boundingBoxToGroupBounds(box: BoundingBox): GroupBounds {
  return {
    x: box.left,
    y: box.top,
    width: box.width,
    height: box.height,
  };
}

/**
 * Calculate the bounds of a group node
 */
export const getGroupBounds = (groupNode: Node): GroupBounds => {
  return boundingBoxToGroupBounds(getNodeBoundingBox(groupNode));
};

/**
 * Calculate the bounds of a regular node
 */
export const getNodeBounds = (node: Node): GroupBounds => {
  return boundingBoxToGroupBounds(getNodeBoundingBox(node));
};

/**
 * Check if a node is completely inside a group's bounds
 */
export const isNodeInsideGroup = (node: Node, groupNode: Node, nodeDefinitions: NodeDefinition[]): boolean => {
  if (node.id === groupNode.id) {
    return false;
  } // Node cannot be inside itself
  if (nodeHasGroupBehavior(node, nodeDefinitions)) {
    return false;
  } // Groups cannot be inside other groups for now

  const nodeBounds = getNodeBoundingBox(node);
  const groupBounds = getNodeBoundingBox(groupNode);

  return isRectangleInsideAnother(nodeBounds, groupBounds);
};

/**
 * Check if a node overlaps with a group's bounds (for visual feedback)
 */
export const isNodeOverlappingGroup = (node: Node, groupNode: Node, nodeDefinitions: NodeDefinition[]): boolean => {
  if (node.id === groupNode.id) {
    return false;
  }
  if (nodeHasGroupBehavior(node, nodeDefinitions)) {
    return false;
  }

  const nodeBounds = getNodeBoundingBox(node);
  const groupBounds = getNodeBoundingBox(groupNode);

  return doRectanglesIntersect(nodeBounds, groupBounds);
};

/**
 * Check if autoGroup is enabled for a specific group node
 */
export const isAutoGroupEnabled = (groupNode: Node, nodeDefinitions: NodeDefinition[]): boolean => {
  const def = nodeDefinitions.find((d) => d.type === groupNode.type);
  const options = getGroupBehaviorOptions(def);
  return options?.autoGroup ?? false;
};

/**
 * Find which group (if any) a node should belong to
 * Returns the most specific (smallest) group that completely contains the node
 * Only considers groups with autoGroup enabled
 */
export const findContainingGroup = (
  node: Node,
  allNodes: Record<NodeId, Node>,
  nodeDefinitions: NodeDefinition[],
): NodeId | null => {
  const groupNodes = Object.values(allNodes).filter((n) => {
    if (!nodeHasGroupBehavior(n, nodeDefinitions)) {
      return false;
    }
    return isAutoGroupEnabled(n, nodeDefinitions);
  });

  let containingGroup: Node | null = null;
  let smallestArea = Infinity;

  for (const groupNode of groupNodes) {
    if (isNodeInsideGroup(node, groupNode, nodeDefinitions)) {
      const groupBounds = getNodeBoundingBox(groupNode);
      const area = groupBounds.width * groupBounds.height;

      if (area < smallestArea) {
        smallestArea = area;
        containingGroup = groupNode;
      }
    }
  }

  return containingGroup?.id || null;
};

// Cache for children lookup to avoid O(n) searches
let childrenMapCache: Map<NodeId, NodeId[]> | null = null;
let lastNodesReference: Record<NodeId, Node> | null = null;

/**
 * Get all nodes that are children of a group (optimized with caching)
 */
export const getGroupChildren = (groupId: NodeId, allNodes: Record<NodeId, Node>): Node[] => {
  // Rebuild cache if nodes reference changed
  if (lastNodesReference !== allNodes) {
    childrenMapCache = createParentToChildrenMap(allNodes);
    lastNodesReference = allNodes;
  }

  const childIds = childrenMapCache?.get(groupId) || [];
  return childIds.map((id) => allNodes[id]).filter(Boolean);
};

/**
 * Get all descendants of a group (children and their children recursively)
 */
export const getGroupDescendants = (
  groupId: NodeId,
  allNodes: Record<NodeId, Node>,
  nodeDefinitions: NodeDefinition[],
): Node[] => {
  const descendants: Node[] = [];
  const toProcess = [groupId];

  while (toProcess.length > 0) {
    const currentId = toProcess.pop()!;
    const children = getGroupChildren(currentId, allNodes);

    descendants.push(...children);
    toProcess.push(...children.filter((n) => nodeHasGroupBehavior(n, nodeDefinitions)).map((n) => n.id));
  }

  return descendants;
};

/**
 * Calculate the offset between a group and its child when the group moves
 */
export const calculateChildOffset = (
  groupDelta: { x: number; y: number },
  _child: Node,
  _group: Node,
): { x: number; y: number } => {
  // Children move exactly the same amount as their parent group
  return groupDelta;
};

/**
 * Update group membership based on current node positions
 */
export const updateGroupMembership = (
  allNodes: Record<NodeId, Node>,
  nodeDefinitions: NodeDefinition[],
): Record<NodeId, Partial<Node>> => {
  const updates: Record<NodeId, Partial<Node>> = {};

  // Get all non-group nodes
  const regularNodes = Object.values(allNodes).filter((n) => !nodeHasGroupBehavior(n, nodeDefinitions));

  for (const node of regularNodes) {
    const newParentId = findContainingGroup(node, allNodes, nodeDefinitions);

    const currentParentId = node.parentId ?? null;
    if (currentParentId !== newParentId) {
      updates[node.id] = {
        parentId: newParentId ?? undefined,
      };
    }
  }

  return updates;
};

/**
 * Get the root position of a node (accounting for group hierarchy)
 */
export const getAbsolutePosition = (node: Node, allNodes: Record<NodeId, Node>): { x: number; y: number } => {
  const position = { ...node.position };
  let currentNode = node;

  // Walk up the parent chain
  while (currentNode.parentId) {
    const parent = allNodes[currentNode.parentId];
    if (!parent) {
      break;
    }

    position.x += parent.position.x;
    position.y += parent.position.y;
    currentNode = parent;
  }

  return position;
};

/**
 * Convert absolute position to relative position within a group
 */
export const getRelativePosition = (
  absolutePosition: { x: number; y: number },
  groupNode: Node,
): { x: number; y: number } => {
  return {
    x: absolutePosition.x - groupNode.position.x,
    y: absolutePosition.y - groupNode.position.y,
  };
};

/**
 * Check if a group move would cause invalid nesting
 */
export const isValidGroupMove = (
  groupId: NodeId,
  newPosition: { x: number; y: number },
  allNodes: Record<NodeId, Node>,
  nodeDefinitions: NodeDefinition[],
): boolean => {
  // For now, we don't allow groups to be nested inside other groups
  // This can be extended later if needed
  const groupNode = allNodes[groupId];
  if (!groupNode || !nodeHasGroupBehavior(groupNode, nodeDefinitions)) {
    return true;
  }

  const tempNode = { ...groupNode, position: newPosition };
  const containingGroup = findContainingGroup(tempNode, allNodes, nodeDefinitions);

  return containingGroup === null;
};
