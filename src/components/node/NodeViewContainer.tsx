/**
 * @file Container component that handles context subscriptions for NodeView
 * Computes derived state and passes it to the pure NodeViewPresenter
 */
import * as React from "react";
import type { Node, Position, Port, ResizeHandle as NodeResizeHandle } from "../../types/core";
import type { ConnectablePortsResult } from "../../core/port/connectivity/connectableTypes";
import { useInlineEditingActions, useInlineEditingState } from "../../contexts/InlineEditingContext";
import { useNodeEditorApi, useNodeEditorSelector } from "../../contexts/composed/node-editor/context";
import { useNodeDefinition } from "../../contexts/node-definitions/hooks/useNodeDefinition";
import { useExternalDataRef } from "../../contexts/external-data/ExternalDataContext";
import { useExternalData } from "../../contexts/external-data/useExternalData";
import { useCanvasInteractionActions, useCanvasInteractionSelector } from "../../contexts/composed/canvas/interaction/context";
import { computeNodeDerivedState } from "../../core/node/nodeState";
import { hasGroupBehavior } from "../../types/behaviors";
import { NodeViewPresenter } from "./NodeViewPresenter";
import type { NodeRendererProps } from "../../types/NodeDefinition";

export type NodeViewContainerProps = {
  node: Node;
  isSelected: boolean;
  isDragging: boolean;
  isResizing?: boolean;
  dragOffset?: Position;
  onPointerDown: (e: React.PointerEvent, nodeId: string, isDragAllowed?: boolean) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
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
  nodeRenderer?: (props: NodeRendererProps) => React.ReactNode;
  externalData?: unknown;
  onUpdateNode?: (updates: Partial<Node>) => void;
  /** Port label visibility - calculated at NodeLayer level for performance */
  showPortLabels?: boolean;
};

const NodeViewContainerComponent: React.FC<NodeViewContainerProps> = ({
  node,
  isSelected,
  isDragging,
  dragOffset,
  nodeRenderer,
  onPointerDown,
  onContextMenu,
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
  showPortLabels,
}) => {
  const { actions: nodeEditorActions, getNodePorts, getNodeById } = useNodeEditorApi();
  // Use split hooks for better performance
  const editingState = useInlineEditingState();
  const { isEditing, startEditing, updateValue, confirmEdit, cancelEdit } = useInlineEditingActions();
  const { actions: interactionActions } = useCanvasInteractionActions();
  const resizeState = useCanvasInteractionSelector((state) => {
    const current = state.resizeState;
    if (!current) {
      return null;
    }
    return current.nodeId === node.id ? current : null;
  });
  const nodeDefinition = useNodeDefinition(node.type);
  const externalDataRef = useExternalDataRef(node.id);
  const externalDataState = useExternalData(node, externalDataRef);

  const isGroup = React.useMemo(() => hasGroupBehavior(nodeDefinition), [nodeDefinition]);

  const groupChildrenCount = useNodeEditorSelector(
    (state) => {
      if (!isGroup) {
        return 0;
      }
      return Object.values(state.nodes).reduce((acc, candidate) => {
        return acc + (candidate.parentId === node.id ? 1 : 0);
      }, 0);
    },
    { areEqual: (a, b) => a === b },
  );

  const derivedState = React.useMemo(() => {
    return computeNodeDerivedState(
      node,
      nodeDefinition,
      resizeState,
      dragOffset,
      isDragging,
      groupChildrenCount,
    );
  }, [node, nodeDefinition, resizeState, dragOffset, isDragging, groupChildrenCount]);

  // Whether this node has an unknown/unregistered type
  const isUnknownType = nodeDefinition === undefined;

  const ports = React.useMemo(() => {
    // Skip port resolution for unknown node types
    if (isUnknownType) {
      return [];
    }
    return getNodePorts(node.id) || [];
  }, [getNodePorts, isUnknownType, node, nodeDefinition]);

  const isEditingTitle = isEditing(node.id, "title");

  // Use useEffectEvent for stable event handler references
  // These handlers always access the latest props/state without causing re-renders
  const handleTitleDoubleClick = React.useEffectEvent((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.locked) {
      const currentTitle = node.data.title || "";
      startEditing(node.id, "title", currentTitle);
    }
  });

  const handleEditingChange = React.useEffectEvent((e: React.ChangeEvent<HTMLInputElement>) => {
    updateValue(e.target.value);
  });

  const handleEditingKeyDown = React.useEffectEvent((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      nodeEditorActions.updateNode(node.id, {
        data: {
          ...node.data,
          title: editingState.currentValue,
        },
      });
      confirmEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
    }
  });

  const handleEditingBlur = React.useEffectEvent(() => {
    nodeEditorActions.updateNode(node.id, {
      data: {
        ...node.data,
        title: editingState.currentValue,
      },
    });
    confirmEdit();
  });

  const handleUpdateNode = React.useEffectEvent((updates: Partial<Node>) => {
    nodeEditorActions.updateNode(node.id, updates);
  });

  const handleStartEdit = React.useEffectEvent(() => {
    startEditing(node.id, "title", node.data.title || "");
  });

  const handleResizeStart = React.useEffectEvent((e: React.PointerEvent, handle: NodeResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();

    if (node.locked) {
      return;
    }

    const liveNode = getNodeById(node.id) || node;
    const currentSize = {
      width: liveNode.size?.width || 150,
      height: liveNode.size?.height || 50,
    };

    interactionActions.startNodeResize(node.id, { x: e.clientX, y: e.clientY }, currentSize, handle, {
      x: liveNode.position.x,
      y: liveNode.position.y,
    });
  });

  return (
    <NodeViewPresenter
      node={node}
      isSelected={isSelected}
      isDragging={isDragging}
      dragOffset={dragOffset}
      nodeRenderer={nodeRenderer}
      behaviorState={derivedState.behaviorState}
      appearance={derivedState.appearance}
      resizeState={derivedState.resizeState}
      displaySize={derivedState.displayGeometry.displaySize}
      isVisuallyDragging={derivedState.isVisuallyDragging}
      hasChildren={derivedState.hasChildren}
      groupChildrenCount={groupChildrenCount}
      nodeDefinition={nodeDefinition}
      isUnknownType={isUnknownType}
      externalDataState={externalDataState}
      ports={ports}
      isEditingTitle={isEditingTitle}
      editingValue={editingState.currentValue}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onTitleDoubleClick={handleTitleDoubleClick}
      onEditingChange={handleEditingChange}
      onEditingKeyDown={handleEditingKeyDown}
      onEditingBlur={handleEditingBlur}
      onResizeStart={handleResizeStart}
      onUpdateNode={handleUpdateNode}
      onStartEdit={handleStartEdit}
      onPortPointerDown={onPortPointerDown}
      onPortPointerUp={onPortPointerUp}
      onPortPointerEnter={onPortPointerEnter}
      onPortPointerMove={onPortPointerMove}
      onPortPointerLeave={onPortPointerLeave}
      onPortPointerCancel={onPortPointerCancel}
      connectingPort={connectingPort}
      hoveredPort={hoveredPort}
      connectedPortIds={connectedPortIds}
      connectablePorts={connectablePorts}
      candidatePortId={candidatePortId}
      showPortLabels={showPortLabels}
    />
  );
};

export const NodeViewContainer = React.memo(NodeViewContainerComponent);

NodeViewContainer.displayName = "NodeViewContainer";
