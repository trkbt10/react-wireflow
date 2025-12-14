/**
 * @file ConnectedNodeTreeItem container component
 */
import * as React from "react";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { hasGroupBehavior } from "../../../types/behaviors";
import type { NodeId } from "../../../types/core";
import { NodeTreeItem } from "./NodeTreeItem";
import type { ConnectedNodeTreeItemProps } from "./types";

export const ConnectedNodeTreeItem: React.FC<ConnectedNodeTreeItemProps> = ({
  nodeId,
  level,
  onNodeDrop,
}) => {
  const { state: editorState, actions } = useNodeEditor();
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const nodeDefinitions = useNodeDefinitionList();

  const node = editorState.nodes[nodeId];
  if (!node) {
    return null;
  }

  const isSelected = actionState.editingSelectedNodeIds.includes(nodeId);
  const childNodes = React.useMemo(() => {
    const list = Object.values(editorState.nodes).filter((n) => n.parentId === nodeId);
    return list.sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
      const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
      if (ao !== bo) {
        return ao - bo;
      }
      // fallback: stable by title
      const ta = a.data?.title || "";
      const tb = b.data?.title || "";
      return ta.localeCompare(tb);
    });
  }, [editorState.nodes, nodeId]);

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
    const node = editorState.nodes[nodeId];
    if (node) {
      actions.updateNode(nodeId, { visible: node.visible === false });
    }
  });

  const handleToggleLock = React.useEffectEvent((nodeId: NodeId) => {
    const node = editorState.nodes[nodeId];
    if (node) {
      actions.updateNode(nodeId, { locked: !node.locked });
    }
  });

  const handleToggleExpand = React.useEffectEvent((nodeId: NodeId) => {
    const n = editorState.nodes[nodeId];
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
    actions.updateNode(nodeId, { data: { ...editorState.nodes[nodeId]?.data, title } });
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
      childNodes={childNodes}
      onNodeDrop={onNodeDrop}
    />
  );
};
