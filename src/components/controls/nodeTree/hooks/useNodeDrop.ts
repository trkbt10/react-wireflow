/**
 * @file Custom hook for node drop logic in tree list
 */
import * as React from "react";
import type { NodeEditorData, NodeId } from "../../../../types/core";
import type { NodeDefinition } from "../../../../types/NodeDefinition";
import { hasGroupBehavior } from "../../../../types/behaviors";

type UseNodeDropParams = {
  nodeDefinitions: NodeDefinition[];
  getState: () => NodeEditorData;
  updateNode: (nodeId: NodeId, updates: Partial<NodeEditorData["nodes"][NodeId]>) => void;
};

export const useNodeDrop = ({ nodeDefinitions, getState, updateNode }: UseNodeDropParams) => {
  return React.useEffectEvent(
    (draggedNodeId: NodeId, targetNodeId: NodeId, position: "before" | "inside" | "after") => {
      const { nodes } = getState();
      const draggedNode = nodes[draggedNodeId];
      const targetNode = nodes[targetNodeId];

      if (!draggedNode || !targetNode) {
        return;
      }

      // Prevent dropping a node onto itself or its children
      const isDescendant = (nodeId: NodeId, ancestorId: NodeId): boolean => {
        const node = nodes[nodeId];
        if (!node) {
          return false;
        }
        if (node.parentId === ancestorId) {
          return true;
        }
        if (node.parentId) {
          return isDescendant(node.parentId, ancestorId);
        }
        return false;
      };

      if (draggedNodeId === targetNodeId || isDescendant(targetNodeId, draggedNodeId)) {
        return;
      }

      // Helper to renumber orders for a parent's children
      const reorderSiblings = (parentId?: NodeId, insertAtIndex?: number) => {
        const siblings = Object.values(nodes)
          .filter((n) => (n.parentId || undefined) === (parentId || undefined) && n.id !== draggedNodeId)
          .sort((a, b) => {
            const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
            const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
            if (ao !== bo) {
              return ao - bo;
            }
            const ta = a.data?.title || "";
            const tb = b.data?.title || "";
            return ta.localeCompare(tb);
          });
        const list = [...siblings];
        const targetIndex = (() => {
          if (position === "before") {
            return siblings.findIndex((n) => n.id === targetNodeId);
          }
          if (position === "after") {
            return siblings.findIndex((n) => n.id === targetNodeId) + 1;
          }
          return typeof insertAtIndex === "number" ? insertAtIndex : siblings.length;
        })();
        list.splice(Math.max(0, targetIndex), 0, { ...draggedNode, parentId });
        list.forEach((n, idx) => {
          updateNode(n.id, {
            order: idx * 10,
            parentId: n.id === draggedNodeId ? parentId : n.parentId,
          });
        });
      };

      const targetIsGroup = hasGroupBehavior(nodeDefinitions.find((d) => d.type === targetNode.type));

      if (position === "inside" && targetIsGroup) {
        // Drop inside a group, append at end and expand group
        reorderSiblings(targetNodeId);
        if (!targetNode.expanded) {
          updateNode(targetNodeId, { expanded: true });
        }
      } else {
        // Drop before or after target among same parent
        reorderSiblings(targetNode.parentId || undefined);
      }
    },
  );
};
