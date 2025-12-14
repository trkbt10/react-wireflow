/**
 * @file ConnectedNodeTreeItem container component
 */
import * as React from "react";
import { useNodeEditorApi, useNodeEditorSelector } from "../../../contexts/composed/node-editor/context";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { hasGroupBehavior } from "../../../types/behaviors";
import type { NodeId } from "../../../types/core";
import { NodeTreeItem } from "./NodeTreeItem";
import type { ConnectedNodeTreeItemProps, NodeTreeNode } from "./types";
import { getSortedChildNodeIds } from "./utils/nodeTreeIndex";
import { areNodeIdArraysEqual } from "./utils/areNodeIdArraysEqual";

function areNodeTreeNodesEqual(a: NodeTreeNode | null, b: NodeTreeNode | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.id === b.id &&
    a.type === b.type &&
    a.parentId === b.parentId &&
    a.order === b.order &&
    a.locked === b.locked &&
    a.visible === b.visible &&
    a.expanded === b.expanded &&
    a.data?.title === b.data?.title
  );
}

const ConnectedNodeTreeItemComponent: React.FC<ConnectedNodeTreeItemProps> = ({
  nodeId,
  level,
  onNodeDrop,
}) => {
  const { actions, getState } = useNodeEditorApi();
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const nodeDefinitions = useNodeDefinitionList();

  const node = useNodeEditorSelector<NodeTreeNode | null>(
    (state) => {
      const node = state.nodes[nodeId];
      if (!node) {
        return null;
      }
      return {
        id: node.id,
        type: node.type,
        parentId: node.parentId,
        order: node.order,
        locked: node.locked,
        visible: node.visible,
        expanded: node.expanded,
        data: node.data,
      };
    },
    { areEqual: areNodeTreeNodesEqual },
  );

  if (!node) {
    return null;
  }

  const isSelected = actionState.editingSelectedNodeIds.includes(nodeId);

  const childNodeIds = useNodeEditorSelector<readonly NodeId[]>(
    (state) => getSortedChildNodeIds(state.nodes, nodeId),
    { areEqual: areNodeIdArraysEqual },
  );

  const handleSelect = React.useEffectEvent((targetNodeId: NodeId, multiSelect: boolean) => {
    if (multiSelect) {
      actionActions.selectEditingNode(targetNodeId, true);
      actionActions.selectInteractionNode(targetNodeId, true);
      return;
    }
    actionActions.setInteractionSelection([targetNodeId]);
    actionActions.setEditingSelection([targetNodeId]);
  });

  const handleToggleVisibility = React.useEffectEvent((nodeId: NodeId) => {
    const node = getState().nodes[nodeId];
    if (node) {
      actions.updateNode(nodeId, { visible: node.visible === false });
    }
  });

  const handleToggleLock = React.useEffectEvent((nodeId: NodeId) => {
    const node = getState().nodes[nodeId];
    if (node) {
      actions.updateNode(nodeId, { locked: !node.locked });
    }
  });

  const handleToggleExpand = React.useEffectEvent((nodeId: NodeId) => {
    const n = getState().nodes[nodeId];
    if (!n) {
      return;
    }
    const d = nodeDefinitions.find((defn) => defn.type === n.type);
    if (hasGroupBehavior(d)) {
      actions.updateNode(nodeId, { expanded: !n.expanded });
    }
  });

  const handleDeleteNode = React.useEffectEvent((nodeId: NodeId) => {
    actions.deleteNode(nodeId);
  });

  const handleUpdateTitle = React.useEffectEvent((nodeId: NodeId, title: string) => {
    const current = getState().nodes[nodeId];
    if (!current) {
      return;
    }
    actions.updateNode(nodeId, { data: { ...current.data, title } });
  });

  return (
    <NodeTreeItem
      node={node}
      level={level}
      isSelected={isSelected}
      onSelect={handleSelect}
      onToggleVisibility={handleToggleVisibility}
      onToggleLock={handleToggleLock}
      onToggleExpand={handleToggleExpand}
      onDeleteNode={handleDeleteNode}
      onUpdateTitle={handleUpdateTitle}
      childNodeIds={childNodeIds}
      onNodeDrop={onNodeDrop}
    />
  );
};

export const ConnectedNodeTreeItem = React.memo(ConnectedNodeTreeItemComponent);
ConnectedNodeTreeItem.displayName = "ConnectedNodeTreeItem";
