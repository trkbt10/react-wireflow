/**
 * @file NodeTreeItem presentation component
 */
import * as React from "react";
import { hasGroupBehavior } from "../../../types/behaviors";
import { getNodeIcon } from "../../../contexts/node-definitions/utils/iconUtils";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { useI18n } from "../../../i18n/context";
import type { NodeTreeItemProps } from "./types";
import { ConnectedNodeTreeItem } from "./ConnectedNodeTreeItem";
import { NodeTreeItemRow, type NodeTreeItemRowStyle } from "./NodeTreeItemRow";
import { useNodeTreeItemDragAndDrop } from "./hooks/useNodeTreeItemDragAndDrop";
import { useNodeTreeDragNodeSnapshot, useNodeTreeDragStateStore } from "./dragStateStore";

const NodeTreeItemComponent: React.FC<NodeTreeItemProps> = ({
  node,
  level,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onToggleExpand,
  onDeleteNode,
  onUpdateTitle,
  childNodes,
  onNodeDrop,
}) => {
  const { t } = useI18n();
  const nodeDefinitions = useNodeDefinitionList();
  const def = React.useMemo(() => nodeDefinitions.find((d) => d.type === node.type), [nodeDefinitions, node.type]);
  const isGroup = hasGroupBehavior(def);
  const hasChildren = isGroup && childNodes.length > 0;
  const isExpanded = isGroup && node.expanded !== false;

  const isDraggingText = React.useRef(false);
  const dragStateStore = useNodeTreeDragStateStore();
  const { isDragging, isDragOverInside, dragOverPositionAttr } = useNodeTreeDragNodeSnapshot(node.id);

  const treeItemStyle = React.useMemo<NodeTreeItemRowStyle>(
    () => ({
      paddingLeft: `calc(var(--node-editor-space-md) * ${level}px)`,
      "--node-tree-drop-indicator-left": `${level * 16 + 8}px`,
    }),
    [level],
  );

  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useNodeTreeItemDragAndDrop({
    nodeId: node.id,
    isGroup,
    isDraggingTextRef: isDraggingText,
    onNodeDrop,
    dragStateStore,
  });

  const icon = React.useMemo(() => getNodeIcon(node.type, nodeDefinitions), [node.type, nodeDefinitions]);

  return (
    <>
      <NodeTreeItemRow
        nodeId={node.id}
        isSelected={isSelected}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        icon={icon}
        title={node.data?.title}
        untitledLabel={t("untitled")}
        locked={node.locked === true}
        visible={node.visible !== false}
        isDragging={isDragging}
        isDragOverInside={isDragOverInside}
        dragOverPositionAttr={dragOverPositionAttr}
        style={treeItemStyle}
        isDraggingTextRef={isDraggingText}
        onSelect={onSelect}
        onToggleExpand={onToggleExpand}
        onToggleVisibility={onToggleVisibility}
        onToggleLock={onToggleLock}
        onDeleteNode={onDeleteNode}
        onUpdateTitle={onUpdateTitle}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {hasChildren &&
        isExpanded &&
        childNodes.map((childNode) => (
          <ConnectedNodeTreeItem
            key={childNode.id}
            nodeId={childNode.id}
            level={level + 1}
            onNodeDrop={onNodeDrop}
          />
        ))}
    </>
  );
};

export const NodeTreeItem = React.memo(NodeTreeItemComponent);
