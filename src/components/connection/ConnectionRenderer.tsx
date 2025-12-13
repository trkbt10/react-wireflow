/**
 * @file ConnectionRenderer component
 * Renders a single connection, deriving interaction state from context.
 */
import * as React from "react";
import { useNodeEditor } from "../../contexts/composed/node-editor/context";
import {
  useEditorActionState,
  useSelectedNodeIdsSet,
  useSelectedConnectionIdsSet,
} from "../../contexts/composed/EditorActionStateContext";
import { useNodeCanvasUtils } from "../../contexts/composed/canvas/viewport/context";
import {
  useCanvasInteractionState,
  useDraggedNodeIdsSet,
} from "../../contexts/composed/canvas/interaction/context";
import { useDynamicConnectionPoint } from "../../contexts/node-ports/hooks/usePortPosition";
import { useRenderers } from "../../contexts/RendererContext";
import { useInteractionSettings } from "../../contexts/interaction-settings/context";
import { usePointerShortcutMatcher } from "../../contexts/interaction-settings/hooks/usePointerShortcutMatcher";
import { getPreviewPosition } from "../../core/geometry/position";
import { hasPositionChanged, hasSizeChanged } from "../../core/geometry/comparators";
import { getNodeResizeSize } from "../../core/node/resizeState";
import { ensurePort } from "../../core/port/identity/guards";
import { createPortKey } from "../../core/port/identity/key";
import type { Connection, Node as EditorNode, Port as CorePort, Position, Size } from "../../types/core";
import type { PointerType } from "../../types/interaction";

// ============================================================================
// Types
// ============================================================================

export type ConnectionRendererProps = {
  connection: Connection;
};

type ConnectionRendererInnerProps = {
  connection: Connection;
  fromNode: EditorNode;
  toNode: EditorNode;
  fromPort: CorePort;
  toPort: CorePort;
  fromPreviewPosition: Position | null;
  toPreviewPosition: Position | null;
  fromResizeSize: Size | null;
  toResizeSize: Size | null;
  isSelected: boolean;
  isHovered: boolean;
  isAdjacentToSelectedNode: boolean;
  onPointerDown: (e: React.PointerEvent, connectionId: string) => void;
  onPointerEnter: (e: React.PointerEvent, connectionId: string) => void;
  onPointerLeave: (e: React.PointerEvent, connectionId: string) => void;
  onContextMenu: (e: React.MouseEvent, connectionId: string) => void;
};

// ============================================================================
// Inner Component (Pure Rendering)
// ============================================================================

const ConnectionRendererInnerComponent: React.FC<ConnectionRendererInnerProps> = ({
  connection,
  fromNode,
  toNode,
  fromPort,
  toPort,
  fromPreviewPosition,
  toPreviewPosition,
  fromResizeSize,
  toResizeSize,
  isSelected,
  isHovered,
  isAdjacentToSelectedNode,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onContextMenu,
}) => {
  const { connection: ConnectionComponent } = useRenderers();

  return (
    <ConnectionComponent
      connection={connection}
      fromNode={fromNode}
      toNode={toNode}
      fromPort={fromPort}
      toPort={toPort}
      isAdjacentToSelectedNode={isAdjacentToSelectedNode}
      fromNodePosition={fromPreviewPosition || undefined}
      toNodePosition={toPreviewPosition || undefined}
      fromNodeSize={fromResizeSize || undefined}
      toNodeSize={toResizeSize || undefined}
      isSelected={isSelected}
      isHovered={isHovered}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    />
  );
};

const areInnerPropsEqual = (prev: ConnectionRendererInnerProps, next: ConnectionRendererInnerProps): boolean => {
  if (prev.connection !== next.connection) {
    return false;
  }
  if (prev.isSelected !== next.isSelected || prev.isHovered !== next.isHovered) {
    return false;
  }
  if (prev.isAdjacentToSelectedNode !== next.isAdjacentToSelectedNode) {
    return false;
  }
  if (prev.fromNode !== next.fromNode || prev.toNode !== next.toNode) {
    return false;
  }
  if (prev.fromPort !== next.fromPort || prev.toPort !== next.toPort) {
    return false;
  }
  if (hasPositionChanged(prev.fromPreviewPosition, next.fromPreviewPosition)) {
    return false;
  }
  if (hasPositionChanged(prev.toPreviewPosition, next.toPreviewPosition)) {
    return false;
  }
  if (hasSizeChanged(prev.fromResizeSize, next.fromResizeSize)) {
    return false;
  }
  if (hasSizeChanged(prev.toResizeSize, next.toResizeSize)) {
    return false;
  }
  return true;
};

const ConnectionRendererInner = React.memo(ConnectionRendererInnerComponent, areInnerPropsEqual);
ConnectionRendererInner.displayName = "ConnectionRendererInner";

// ============================================================================
// Container Component (Context-Aware)
// ============================================================================

const ConnectionRendererContainerComponent: React.FC<ConnectionRendererProps> = ({ connection }) => {
  const { state: nodeEditorState, portLookupMap } = useNodeEditor();
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const utils = useNodeCanvasUtils();
  const interactionState = useCanvasInteractionState();
  const interactionSettings = useInteractionSettings();
  const matchesPointerAction = usePointerShortcutMatcher();

  // Use shared memoized Sets from context
  const selectedConnectionIdsSet = useSelectedConnectionIdsSet();
  const selectedNodeIdsSet = useSelectedNodeIdsSet();
  const draggedNodeIdsSet = useDraggedNodeIdsSet();

  const { dragState, resizeState } = interactionState;
  const { hoveredConnectionId } = actionState;

  // Derive interaction state for this connection
  const isSelected = selectedConnectionIdsSet.has(connection.id);
  const isHovered = hoveredConnectionId === connection.id;
  const isAdjacentToSelectedNode =
    selectedNodeIdsSet.has(connection.fromNodeId) || selectedNodeIdsSet.has(connection.toNodeId);

  // Derive drag offsets
  const isFromDragging = draggedNodeIdsSet?.has(connection.fromNodeId) ?? false;
  const isToDragging = draggedNodeIdsSet?.has(connection.toNodeId) ?? false;
  const fromDragOffset = isFromDragging && dragState ? dragState.offset : null;
  const toDragOffset = isToDragging && dragState ? dragState.offset : null;

  // Derive resize sizes
  const fromResizeSize = getNodeResizeSize(resizeState, connection.fromNodeId);
  const toResizeSize = getNodeResizeSize(resizeState, connection.toNodeId);

  // Get nodes
  const fromNode = nodeEditorState.nodes[connection.fromNodeId];
  const toNode = nodeEditorState.nodes[connection.toNodeId];

  // Get dynamic port positions (used for validation in event handlers)
  const fromPortPos = useDynamicConnectionPoint(connection.fromNodeId, connection.fromPortId);
  const toPortPos = useDynamicConnectionPoint(connection.toNodeId, connection.toPortId);

  // Get ports with fallback
  const fromRaw = portLookupMap.get(createPortKey(connection.fromNodeId, connection.fromPortId))?.port as unknown;
  const toRaw = portLookupMap.get(createPortKey(connection.toNodeId, connection.toPortId))?.port as unknown;

  const fromPort: CorePort = ensurePort(fromRaw, {
    id: connection.fromPortId,
    nodeId: connection.fromNodeId,
    type: "output",
    label: connection.fromPortId,
    position: "right",
  });
  const toPort: CorePort = ensurePort(toRaw, {
    id: connection.toPortId,
    nodeId: connection.toNodeId,
    type: "input",
    label: connection.toPortId,
    position: "left",
  });

  // Event handlers using useEffectEvent for stable references
  const handlePointerDown = React.useEffectEvent((e: React.PointerEvent, connectionId: string) => {
    if (!fromNode || !toNode || !fromPortPos || !toPortPos) {
      return;
    }

    const nativeEvent = e.nativeEvent;
    const matchesMultiSelect = matchesPointerAction("node-add-to-selection", nativeEvent);
    const matchesSelect = matchesPointerAction("node-select", nativeEvent) || matchesMultiSelect;

    if (!matchesSelect && !matchesMultiSelect) {
      return;
    }

    actionActions.selectConnection(connectionId, matchesMultiSelect);
  });

  const handlePointerEnter = React.useEffectEvent((_e: React.PointerEvent, connectionId: string) => {
    actionActions.setHoveredConnection(connectionId);
  });

  const handlePointerLeave = React.useEffectEvent((_e: React.PointerEvent, _connectionId: string) => {
    actionActions.setHoveredConnection(null);
  });

  const handleContextMenu = React.useEffectEvent((e: React.MouseEvent, connectionId: string) => {
    const nativeEvent = e.nativeEvent as MouseEvent & { pointerType?: string };
    if (!matchesPointerAction("node-open-context-menu", nativeEvent)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const pointerType: PointerType | "unknown" =
      nativeEvent.pointerType === "mouse" || nativeEvent.pointerType === "touch" || nativeEvent.pointerType === "pen"
        ? (nativeEvent.pointerType as PointerType)
        : "unknown";

    const position = { x: e.clientX, y: e.clientY };
    const canvasPos = utils.screenToCanvas(e.clientX, e.clientY);

    const defaultShow = () => actionActions.showContextMenu({ position, canvasPosition: canvasPos, connectionId });

    const handler = interactionSettings.contextMenu.handleRequest;
    if (handler) {
      handler({
        target: { kind: "connection", connectionId },
        screenPosition: position,
        canvasPosition: canvasPos,
        pointerType,
        event: nativeEvent,
        defaultShow,
      });
      return;
    }

    defaultShow();
  });

  // Early return if nodes are missing or not visible
  if (!fromNode || !toNode) {
    return null;
  }
  if (fromNode.visible === false || toNode.visible === false) {
    return null;
  }

  // Calculate preview positions
  const fromPreviewPosition = getPreviewPosition(fromNode.position, fromDragOffset);
  const toPreviewPosition = getPreviewPosition(toNode.position, toDragOffset);

  return (
    <ConnectionRendererInner
      connection={connection}
      fromNode={fromNode}
      toNode={toNode}
      fromPort={fromPort}
      toPort={toPort}
      fromPreviewPosition={fromPreviewPosition}
      toPreviewPosition={toPreviewPosition}
      fromResizeSize={fromResizeSize}
      toResizeSize={toResizeSize}
      isSelected={isSelected}
      isHovered={isHovered}
      isAdjacentToSelectedNode={isAdjacentToSelectedNode}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onContextMenu={handleContextMenu}
    />
  );
};

export const ConnectionRenderer = React.memo(ConnectionRendererContainerComponent);
ConnectionRenderer.displayName = "ConnectionRenderer";
