/**
 * @file Helper functions for node drag operations
 * Provides utilities for determining draggable nodes, collecting positions,
 * and handling group movement during drag interactions
 */
import type { Node } from "../../../../types/core";
import type { NodeDefinition } from "../../../../types/NodeDefinition";
import { nodeHasGroupBehavior } from "../../../../types/behaviors";

/**
 * Determine which nodes should be dragged
 */
export function getNodesToDrag(
  nodeId: string,
  isMultiSelect: boolean,
  selectedNodeIds: string[],
  nodes: Record<string, Node>,
  isInteractive: boolean,
  isDragAllowed: boolean,
): string[] {
  const clickedNode = nodes[nodeId];
  if (!clickedNode || clickedNode.locked) {
    return [];
  }

  // For interactive nodes, check if dragging is allowed
  if (isInteractive && !isDragAllowed && !selectedNodeIds.includes(nodeId)) {
    return [];
  }

  let nodesToDrag: string[];

  if (selectedNodeIds.includes(nodeId)) {
    // Filter out locked nodes and child nodes of selected groups
    nodesToDrag = selectedNodeIds.filter((id) => {
      const node = nodes[id];
      if (!node || node.locked) {
        return false;
      }

      // Skip children if parent is selected
      if (node.parentId && selectedNodeIds.includes(node.parentId)) {
        return false;
      }

      return true;
    });
  } else {
    if (isMultiSelect) {
      const allSelected = [...selectedNodeIds, nodeId];
      nodesToDrag = allSelected.filter((id) => {
        const node = nodes[id];
        if (!node || node.locked) {
          return false;
        }

        if (node.parentId && allSelected.includes(node.parentId)) {
          return false;
        }

        return true;
      });
    } else {
      // For single node, check if it's interactive and drag is not allowed
      if (isInteractive && !isDragAllowed) {
        return []; // Don't start drag
      }
      nodesToDrag = [nodeId];
    }
  }

  return nodesToDrag;
}

/**
 * Collect initial positions for dragging nodes
 */
export function collectInitialPositions(
  nodeIds: string[],
  nodes: Record<string, Node>,
  getGroupChildren: (groupId: string) => Node[],
  nodeDefinitions: NodeDefinition[],
): {
  initialPositions: Record<string, { x: number; y: number }>;
  affectedChildNodes: Record<string, string[]>;
} {
  const initialPositions: Record<string, { x: number; y: number }> = {};
  const affectedChildNodes: Record<string, string[]> = {};

  nodeIds.forEach((id) => {
    const node = nodes[id];
    if (node) {
      initialPositions[id] = { ...node.position };

      if (nodeHasGroupBehavior(node, nodeDefinitions)) {
        const children = getGroupChildren(id);
        affectedChildNodes[id] = children.map((child) => child.id);

        children.forEach((child) => {
          initialPositions[child.id] = { ...child.position };
        });
      }
    }
  });

  return { initialPositions, affectedChildNodes };
}

/**
 * Calculate new positions for nodes after dragging
 */
export function calculateNewPositions(
  nodeIds: string[],
  initialPositions: Record<string, { x: number; y: number }>,
  offset: { x: number; y: number },
): Record<string, { x: number; y: number }> {
  const newPositions: Record<string, { x: number; y: number }> = {};

  nodeIds.forEach((nodeId) => {
    const initialPos = initialPositions[nodeId];
    if (initialPos) {
      newPositions[nodeId] = {
        x: initialPos.x + offset.x,
        y: initialPos.y + offset.y,
      };
    }
  });

  return newPositions;
}

/**
 * Handle group movement with children
 */
export function handleGroupMovement(
  nodeIds: string[],
  nodes: Record<string, Node>,
  snappedPositions: Record<string, { x: number; y: number }>,
  initialPositions: Record<string, { x: number; y: number }>,
  moveGroupWithChildren: (groupId: string, delta: { x: number; y: number }, affectedNodeIds: string[]) => void,
  nodeDefinitions: NodeDefinition[],
): Record<string, { x: number; y: number }> {
  const groupsToMove = nodeIds.filter((nodeId) => {
    const node = nodes[nodeId];
    return node && nodeHasGroupBehavior(node, nodeDefinitions);
  });

  if (groupsToMove.length === 0) {
    return snappedPositions;
  }

  // Move groups with their children
  groupsToMove.forEach((groupId) => {
    const initialPos = initialPositions[groupId];
    const finalPos = snappedPositions[groupId];
    if (initialPos && finalPos) {
      const delta = {
        x: finalPos.x - initialPos.x,
        y: finalPos.y - initialPos.y,
      };
      const affectedNodeIds = Object.values(nodes)
        .filter((candidate) => candidate.id === groupId || candidate.parentId === groupId)
        .map((candidate) => candidate.id);
      moveGroupWithChildren(groupId, delta, affectedNodeIds);
    }
  });

  // Return non-group positions
  const nonGroupPositions: Record<string, { x: number; y: number }> = {};
  nodeIds.forEach((nodeId) => {
    const node = nodes[nodeId];
    if (node && !nodeHasGroupBehavior(node, nodeDefinitions) && snappedPositions[nodeId]) {
      nonGroupPositions[nodeId] = snappedPositions[nodeId];
    }
  });

  return nonGroupPositions;
}
