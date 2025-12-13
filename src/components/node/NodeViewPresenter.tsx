/**
 * @file Pure UI component for rendering a node
 * Receives all data via props - no context dependencies
 */
import * as React from "react";
import type { Node, Position, Port, Size, ResizeHandle as NodeResizeHandle } from "../../types/core";
import type { NodeDefinition } from "../../types/NodeDefinition";
import type { NodeRendererProps } from "../../types/NodeDefinition";
import type { ConnectablePortsResult } from "../../core/port/connectivity/connectableTypes";
import type { NodeAppearance } from "../../core/node/nodeAppearance";
import type { NodeBehaviorState, NodeResizeState } from "../../core/node/nodeState";
import type { ExternalDataStateWithActions } from "../../contexts/external-data/useExternalData";
import { areExternalDataStatesEqual } from "../../contexts/external-data/useExternalData";
import { areNodeAppearancesEqual } from "../../core/node/nodeAppearance";
import { areNodeBehaviorStatesEqual, areNodeResizeStatesEqual } from "../../core/node/nodeState";
import { hasPositionChanged, hasSizeChanged } from "../../core/geometry/comparators";
import { hasNodeStateChanged } from "../../core/node/comparators";
import { hasPortIdChanged } from "../../core/port/identity/comparators";
import { ResizeHandles } from "./resize/ResizeHandles";
import { NodeBodyRenderer } from "./body/NodeBodyRenderer";
import { NodePortsRenderer } from "../ports/NodePortsRenderer";
import styles from "./NodeView.module.css";

export type NodeViewPresenterProps = {
  node: Node;
  isSelected: boolean;
  isDragging: boolean;
  dragOffset?: Position;
  nodeRenderer?: (props: NodeRendererProps) => React.ReactNode;

  behaviorState: NodeBehaviorState;
  appearance: NodeAppearance;
  resizeState: NodeResizeState;
  displaySize: Size;
  isVisuallyDragging: boolean;
  hasChildren: boolean;
  groupChildrenCount: number;

  nodeDefinition?: NodeDefinition;
  /** Whether this node's type is not registered in the definition registry */
  isUnknownType?: boolean;
  externalDataState: ExternalDataStateWithActions;
  ports: Port[];

  isEditingTitle: boolean;
  editingValue: string;

  onPointerDown: (e: React.PointerEvent, nodeId: string, isDragAllowed?: boolean) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onTitleDoubleClick: (e: React.MouseEvent) => void;
  onEditingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditingKeyDown: (e: React.KeyboardEvent) => void;
  onEditingBlur: () => void;
  onResizeStart: (e: React.PointerEvent, handle: NodeResizeHandle) => void;
  onUpdateNode: (updates: Partial<Node>) => void;
  onStartEdit: () => void;

  onPortPointerDown?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerUp?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerEnter?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerMove?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerLeave?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerCancel?: (e: React.PointerEvent, port: Port) => void;
  connectingPort?: Port;
  hoveredPort?: Port;
  connectedPortIds?: ReadonlySet<string>;
  connectablePorts?: ConnectablePortsResult;
  candidatePortId?: string;
};

const DEBUG_NODEVIEW_PRESENTER_RERENDERS = false;

const NodeViewPresenterComponent: React.FC<NodeViewPresenterProps> = ({
  node,
  isSelected,
  isDragging,
  dragOffset,
  nodeRenderer,
  behaviorState,
  appearance,
  resizeState,
  displaySize,
  isVisuallyDragging,
  hasChildren,
  groupChildrenCount,
  nodeDefinition,
  isUnknownType,
  externalDataState,
  ports,
  isEditingTitle,
  editingValue,
  onPointerDown,
  onContextMenu,
  onTitleDoubleClick,
  onEditingChange,
  onEditingKeyDown,
  onEditingBlur,
  onResizeStart,
  onUpdateNode,
  onStartEdit,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerMove,
  onPortPointerLeave,
  onPortPointerCancel,
  connectingPort,
  hoveredPort,
  connectedPortIds,
  connectablePorts,
  candidatePortId,
}) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const basePosition = React.useMemo(
    () => ({
      x: node.position.x,
      y: node.position.y,
    }),
    [node.position.x, node.position.y],
  );

  React.useLayoutEffect(() => {
    if (!nodeRef.current) {
      return;
    }

    const transformX = resizeState.currentPosition?.x ?? (basePosition.x + (dragOffset?.x ?? 0));
    const transformY = resizeState.currentPosition?.y ?? (basePosition.y + (dragOffset?.y ?? 0));

    nodeRef.current.style.transform = `translate(${transformX}px, ${transformY}px)`;
  }, [basePosition, dragOffset, resizeState.currentPosition]);

  const handleNodePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;

      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isInteractive = nodeDefinition?.interactive;

      if (isInteractive && !isSelected) {
        const isDragHandle = target.closest('[data-drag-handle="true"]');
        onPointerDown(e, node.id, !!isDragHandle);
      } else {
        onPointerDown(e, node.id, true);
      }
    },
    [nodeDefinition?.interactive, node.id, isSelected, onPointerDown],
  );

  const customRenderProps = React.useMemo((): NodeRendererProps => {
    const nodeWithCurrentSize: Node = resizeState.isResizing && resizeState.currentSize
      ? { ...node, size: resizeState.currentSize }
      : node;

    return {
      node: nodeWithCurrentSize,
      isSelected,
      isDragging,
      isResizing: resizeState.isResizing,
      isEditing: isEditingTitle,
      externalData: externalDataState.data,
      isLoadingExternalData: externalDataState.isLoading,
      externalDataError: externalDataState.error,
      onStartEdit,
      onUpdateNode,
    };
  }, [
    node,
    resizeState.isResizing,
    resizeState.currentSize,
    isSelected,
    isDragging,
    isEditingTitle,
    externalDataState.data,
    externalDataState.isLoading,
    externalDataState.error,
    onStartEdit,
    onUpdateNode,
  ]);

  const connectingPortId = connectingPort?.id;
  const { isGroup, isAppearance } = behaviorState;
  const { backgroundWithOpacity, groupBackground, groupTextColor } = appearance;
  const hasCustomRenderer = !!nodeRenderer || !!nodeDefinition?.renderNode;
  const disableOutline = nodeDefinition?.disableOutline ?? false;

  return (
    <div
      ref={nodeRef}
      className={styles.nodeView}
      style={{
        width: displaySize.width,
        height: displaySize.height,
        zIndex: isGroup ? 1 : isDragging || resizeState.isResizing ? 1000 : 2,
        backgroundColor: backgroundWithOpacity ?? groupBackground,
        color: groupTextColor,
        opacity: isVisuallyDragging ? "var(--node-editor-opacity-dragging)" : undefined,
      }}
      onPointerDown={handleNodePointerDown}
      onContextMenu={(e) => onContextMenu(e, node.id)}
      data-node-id={node.id}
      data-selected={isSelected}
      data-dragging={isVisuallyDragging}
      data-resizing={resizeState.isResizing}
      data-locked={node.locked}
      data-visual-state={node.data.visualState || undefined}
      data-is-group={isGroup}
      data-has-children={hasChildren}
      data-plain-node={isAppearance}
      data-custom-renderer={hasCustomRenderer || undefined}
      data-disable-outline={disableOutline || undefined}
      data-unknown-type={isUnknownType || undefined}
    >
      <NodeBodyRenderer
        node={node}
        isSelected={isSelected}
        nodeDefinition={nodeDefinition}
        isUnknownType={isUnknownType}
        nodeRenderer={nodeRenderer}
        customRenderProps={customRenderProps}
        isEditing={isEditingTitle}
        editingValue={editingValue}
        isGroup={isGroup}
        groupChildrenCount={groupChildrenCount}
        groupTextColor={groupTextColor}
        onTitleDoubleClick={onTitleDoubleClick}
        onEditingChange={onEditingChange}
        onEditingKeyDown={onEditingKeyDown}
        onEditingBlur={onEditingBlur}
      />

      <NodePortsRenderer
        ports={ports}
        onPortPointerDown={onPortPointerDown}
        onPortPointerUp={onPortPointerUp}
        onPortPointerEnter={onPortPointerEnter}
        onPortPointerMove={onPortPointerMove}
        onPortPointerLeave={onPortPointerLeave}
        onPortPointerCancel={onPortPointerCancel}
        hoveredPort={hoveredPort}
        connectedPortIds={connectedPortIds}
        connectablePorts={connectablePorts}
        connectingPortId={connectingPortId}
        candidatePortId={candidatePortId}
      />

      {isSelected && !node.locked && (
        <ResizeHandles
          size={displaySize}
          activeHandle={resizeState.currentHandle}
          onResizeStart={onResizeStart}
        />
      )}
    </div>
  );
};

const arePresenterPropsEqual = (
  prevProps: NodeViewPresenterProps,
  nextProps: NodeViewPresenterProps,
): boolean => {
  const nodeId = prevProps.node.id;
  const debugLog = (reason: string, details?: Record<string, unknown>) => {
    if (DEBUG_NODEVIEW_PRESENTER_RERENDERS) {
      console.log(`[NodeViewPresenter:${nodeId}] Re-rendering because:`, reason, details || "");
    }
  };

  if (prevProps.node.id !== nextProps.node.id) {
    debugLog("node.id changed");
    return false;
  }
  if (prevProps.isSelected !== nextProps.isSelected) {
    debugLog("isSelected changed");
    return false;
  }
  if (prevProps.isDragging !== nextProps.isDragging) {
    debugLog("isDragging changed");
    return false;
  }
  if (prevProps.nodeRenderer !== nextProps.nodeRenderer) {
    debugLog("nodeRenderer changed");
    return false;
  }
  if (prevProps.isVisuallyDragging !== nextProps.isVisuallyDragging) {
    debugLog("isVisuallyDragging changed");
    return false;
  }
  if (prevProps.hasChildren !== nextProps.hasChildren) {
    debugLog("hasChildren changed");
    return false;
  }
  if (prevProps.groupChildrenCount !== nextProps.groupChildrenCount) {
    debugLog("groupChildrenCount changed");
    return false;
  }
  if (prevProps.isEditingTitle !== nextProps.isEditingTitle) {
    debugLog("isEditingTitle changed");
    return false;
  }
  if (prevProps.editingValue !== nextProps.editingValue) {
    debugLog("editingValue changed");
    return false;
  }
  if (prevProps.candidatePortId !== nextProps.candidatePortId) {
    debugLog("candidatePortId changed");
    return false;
  }
  if (prevProps.connectablePorts !== nextProps.connectablePorts) {
    debugLog("connectablePorts changed");
    return false;
  }

  if (!areNodeBehaviorStatesEqual(prevProps.behaviorState, nextProps.behaviorState)) {
    debugLog("behaviorState changed");
    return false;
  }
  if (!areNodeAppearancesEqual(prevProps.appearance, nextProps.appearance)) {
    debugLog("appearance changed");
    return false;
  }
  if (!areNodeResizeStatesEqual(prevProps.resizeState, nextProps.resizeState)) {
    debugLog("resizeState changed");
    return false;
  }

  if (hasPositionChanged(prevProps.node.position, nextProps.node.position)) {
    debugLog("node.position changed");
    return false;
  }
  if (hasSizeChanged(prevProps.displaySize, nextProps.displaySize)) {
    debugLog("displaySize changed");
    return false;
  }
  if (hasNodeStateChanged(prevProps.node, nextProps.node)) {
    debugLog("node state changed");
    return false;
  }
  if (prevProps.node.data !== nextProps.node.data) {
    debugLog("node.data changed");
    return false;
  }

  if (hasPositionChanged(prevProps.dragOffset, nextProps.dragOffset)) {
    debugLog("dragOffset changed");
    return false;
  }

  if (hasPortIdChanged(prevProps.connectingPort, nextProps.connectingPort)) {
    debugLog("connectingPort changed");
    return false;
  }
  if (hasPortIdChanged(prevProps.hoveredPort, nextProps.hoveredPort)) {
    debugLog("hoveredPort changed");
    return false;
  }

  if (prevProps.ports !== nextProps.ports) {
    debugLog("ports changed");
    return false;
  }

  if (!areExternalDataStatesEqual(prevProps.externalDataState, nextProps.externalDataState)) {
    debugLog("externalDataState changed");
    return false;
  }

  if (DEBUG_NODEVIEW_PRESENTER_RERENDERS) {
    console.log(`[NodeViewPresenter:${nodeId}] Skipped re-render`);
  }
  return true;
};

export const NodeViewPresenter = React.memo(NodeViewPresenterComponent, arePresenterPropsEqual);

NodeViewPresenter.displayName = "NodeViewPresenter";
