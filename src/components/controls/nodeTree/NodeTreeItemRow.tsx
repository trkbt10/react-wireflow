/**
 * @file NodeTreeItem row UI
 */
import * as React from "react";
import styles from "./NodeTreeItem.module.css";
import type { NodeId } from "../../../types/core";
import { NodeTreeItemActionButtons } from "./NodeTreeItemActionButtons";
import { NodeTreeItemName } from "./NodeTreeItemName";

export type NodeTreeItemRowStyle = React.CSSProperties & {
  "--node-tree-drop-indicator-left": string;
};

export type NodeTreeItemRowProps = {
  nodeId: NodeId;
  isSelected: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  icon: React.ReactNode;
  title: string | undefined;
  untitledLabel: string;
  locked: boolean;
  visible: boolean;
  isDragging: boolean;
  isDragOverInside: boolean;
  dragOverPositionAttr: "before" | "after" | undefined;
  style: NodeTreeItemRowStyle;
  isDraggingTextRef: React.MutableRefObject<boolean>;
  onSelect: (nodeId: NodeId, multiSelect: boolean) => void;
  onToggleExpand: ((nodeId: NodeId) => void) | undefined;
  onToggleVisibility: ((nodeId: NodeId) => void) | undefined;
  onToggleLock: ((nodeId: NodeId) => void) | undefined;
  onDeleteNode: ((nodeId: NodeId) => void) | undefined;
  onUpdateTitle: ((nodeId: NodeId, title: string) => void) | undefined;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

export const NodeTreeItemRow: React.FC<NodeTreeItemRowProps> = React.memo(
  ({
    nodeId,
    isSelected,
    hasChildren,
    isExpanded,
    icon,
    title,
    untitledLabel,
    locked,
    visible,
    isDragging,
    isDragOverInside,
    dragOverPositionAttr,
    style,
    isDraggingTextRef,
    onSelect,
    onToggleExpand,
    onToggleVisibility,
    onToggleLock,
    onDeleteNode,
    onUpdateTitle,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
  }) => {
    const handleClick = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(nodeId, e.ctrlKey || e.metaKey);
      },
      [nodeId, onSelect],
    );

    const handleToggleExpand = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onToggleExpand || !hasChildren) {
          return;
        }
        onToggleExpand(nodeId);
      },
      [hasChildren, nodeId, onToggleExpand],
    );

    return (
      <div
        className={styles.treeItem}
        data-selected={isSelected}
        data-dragging={isDragging}
        data-drag-over-inside={isDragOverInside}
        data-drag-over-position={dragOverPositionAttr}
        style={style}
        onClick={handleClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {hasChildren && (
          <button
            className={styles.expandButton}
            onClick={handleToggleExpand}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="currentColor"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path d="M2 1l4 3-4 3V1z" />
            </svg>
          </button>
        )}

        <span className={styles.nodeIcon}>{icon}</span>

        <NodeTreeItemName
          nodeId={nodeId}
          title={title}
          untitledLabel={untitledLabel}
          onUpdateTitle={onUpdateTitle}
          isDraggingTextRef={isDraggingTextRef}
        />

        <NodeTreeItemActionButtons
          nodeId={nodeId}
          locked={locked}
          visible={visible}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
          onDeleteNode={onDeleteNode}
        />
      </div>
    );
  },
);

NodeTreeItemRow.displayName = "NodeTreeItemRow";
