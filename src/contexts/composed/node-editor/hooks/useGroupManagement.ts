/**
 * @file Hook for managing group node relationships and operations
 */
import * as React from "react";
import { useNodeEditor } from "../context";
import { useEditorActionState } from "../../EditorActionStateContext";
import { useCanvasInteractionDragState } from "../../canvas/interaction/context";
import { useNodeDefinitionList } from "../../../node-definitions/hooks/useNodeDefinitionList";
import type { NodeId, Node } from "../../../../types/core";
import {
  updateGroupMembership,
  getGroupChildren,
  getGroupDescendants,
  isValidGroupMove,
} from "../utils/groupOperations";

export type UseGroupManagementOptions = {
  /** Whether to automatically update group membership when nodes move */
  autoUpdateMembership?: boolean;
  /** Debounce delay for membership updates (ms) */
  membershipUpdateDelay?: number;
};

export type UseGroupManagementResult = {
  /** Update group membership for all nodes */
  updateAllGroupMembership: () => void;
  /** Check if a node is in a group */
  isNodeInGroup: (nodeId: NodeId) => boolean;
  /** Get the parent group of a node */
  getNodeParentGroup: (nodeId: NodeId) => NodeId | null;
  /** Get all children of a group */
  getGroupChildren: (groupId: NodeId) => Node[];
  /** Get all descendants of a group */
  getGroupDescendants: (groupId: NodeId) => Node[];
  /** Move a group with all its children */
  moveGroupWithChildren: (groupId: NodeId, delta: { x: number; y: number }) => void;
  /** Check if a group move would be valid */
  isValidGroupMove: (groupId: NodeId, newPosition: { x: number; y: number }) => boolean;
};

/**
 * Hook for managing group relationships and operations
 */
export const useGroupManagement = (options: UseGroupManagementOptions = {}): UseGroupManagementResult => {
  const { state, actions } = useNodeEditor();
  const { state: _actionState } = useEditorActionState();
  const dragState = useCanvasInteractionDragState();
  const nodeDefinitions = useNodeDefinitionList();
  const { autoUpdateMembership = true, membershipUpdateDelay = 100 } = options;

  // Debounced membership update
  const updateMembershipTimeoutRef = React.useRef<number | undefined>(undefined);
  const nodesRef = React.useRef(state.nodes);
  nodesRef.current = state.nodes;
  const nodeDefinitionsRef = React.useRef(nodeDefinitions);
  nodeDefinitionsRef.current = nodeDefinitions;

  const updateAllGroupMembership = React.useCallback(() => {
    const updates = updateGroupMembership(nodesRef.current, nodeDefinitionsRef.current);
    if (Object.keys(updates).length > 0) {
      actions.updateGroupMembership(updates);
    }
  }, [actions]);

  // Auto-update membership when nodes change position (but not during drag)
  React.useEffect(() => {
    if (!autoUpdateMembership) {
      return;
    }

    // Clear existing timeout
    if (updateMembershipTimeoutRef.current) {
      clearTimeout(updateMembershipTimeoutRef.current);
    }

    // Only update if we're not currently dragging nodes
    // This prevents continuous updates during drag operations
    const isDragging = dragState !== null;

    if (!isDragging) {
      // Set new timeout for debounced update
      updateMembershipTimeoutRef.current = window.setTimeout(() => {
        updateAllGroupMembership();
      }, membershipUpdateDelay);
    }

    return () => {
      if (updateMembershipTimeoutRef.current) {
        clearTimeout(updateMembershipTimeoutRef.current);
      }
    };
  }, [autoUpdateMembership, dragState, membershipUpdateDelay, state.nodes, nodeDefinitions, updateAllGroupMembership]);

  const isNodeInGroup = React.useCallback(
    (nodeId: NodeId): boolean => {
      const node = nodesRef.current[nodeId];
      return !!(node && node.parentId);
    },
    [nodesRef],
  );

  const getNodeParentGroup = React.useCallback((nodeId: NodeId): NodeId | null => {
    const node = nodesRef.current[nodeId];
    return node?.parentId || null;
  }, []);

  const getGroupChildrenNodes = React.useCallback((groupId: NodeId): Node[] => {
    return getGroupChildren(groupId, nodesRef.current);
  }, []);

  const getGroupDescendantNodes = React.useCallback((groupId: NodeId): Node[] => {
    return getGroupDescendants(groupId, nodesRef.current, nodeDefinitionsRef.current);
  }, []);

  const moveGroupWithChildren = React.useCallback(
    (groupId: NodeId, delta: { x: number; y: number }) => {
      actions.moveGroupWithChildren(groupId, delta);
    },
    [actions],
  );

  const isValidGroupMoveCheck = React.useCallback((groupId: NodeId, newPosition: { x: number; y: number }): boolean => {
    return isValidGroupMove(groupId, newPosition, nodesRef.current, nodeDefinitionsRef.current);
  }, []);

  return {
    updateAllGroupMembership,
    isNodeInGroup,
    getNodeParentGroup,
    getGroupChildren: getGroupChildrenNodes,
    getGroupDescendants: getGroupDescendantNodes,
    moveGroupWithChildren,
    isValidGroupMove: isValidGroupMoveCheck,
  };
};
