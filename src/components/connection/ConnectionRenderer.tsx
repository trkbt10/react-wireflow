/**
 * @file ConnectionRenderer component
 * Renders a single connection, deriving interaction state from context.
 */
import * as React from "react";
import { useNodeEditorApi, useNodeEditorSelector } from "../../contexts/composed/node-editor/context";
import {
  useEditorActionState,
  useSelectedNodeIdsSet,
  useSelectedConnectionIdsSet,
} from "../../contexts/composed/EditorActionStateContext";
import { useNodeCanvasUtils } from "../../contexts/composed/canvas/viewport/context";
import {
  useCanvasInteractionSelector,
} from "../../contexts/composed/canvas/interaction/context";
import { useRenderers } from "../../contexts/RendererContext";
import { useInteractionSettings } from "../../contexts/interaction-settings/context";
import { usePointerShortcutMatcher } from "../../contexts/interaction-settings/hooks/usePointerShortcutMatcher";
import { getPreviewPosition } from "../../core/geometry/position";
import { hasPositionChanged, hasSizeChanged } from "../../core/geometry/comparators";
import { getNodeResizeSize } from "../../core/node/resizeState";
import { ensurePort } from "../../core/port/identity/guards";
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
  const { getNodePorts } = useNodeEditorApi();
  const nodesForConnection = useNodeEditorSelector(
    (state) => ({
      fromNode: state.nodes[connection.fromNodeId],
      toNode: state.nodes[connection.toNodeId],
    }),
    {
      areEqual: (a, b) => a.fromNode === b.fromNode && a.toNode === b.toNode,
    },
  );
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const utils = useNodeCanvasUtils();
  const interactionSettings = useInteractionSettings();
  const matchesPointerAction = usePointerShortcutMatcher();

  // Use shared memoized Sets from context
  const selectedConnectionIdsSet = useSelectedConnectionIdsSet();
  const selectedNodeIdsSet = useSelectedNodeIdsSet();

  const { hoveredConnectionId } = actionState;

  // Derive interaction state for this connection
  const isSelected = selectedConnectionIdsSet.has(connection.id);
  const isHovered = hoveredConnectionId === connection.id;
  const isAdjacentToSelectedNode =
    selectedNodeIdsSet.has(connection.fromNodeId) || selectedNodeIdsSet.has(connection.toNodeId);

  const interactionPreview = useCanvasInteractionSelector(
    (state) => {
      const drag = state.dragState;
      const isDragged = (nodeId: string): boolean => {
        if (!drag) {
          return false;
        }
        if (drag.nodeIds.includes(nodeId)) {
          return true;
        }
        for (const childIds of Object.values(drag.affectedChildNodes)) {
          if (childIds.includes(nodeId)) {
            return true;
          }
        }
        return false;
      };

      const fromDragOffset = drag && isDragged(connection.fromNodeId) ? drag.offset : null;
      const toDragOffset = drag && isDragged(connection.toNodeId) ? drag.offset : null;

      const fromResizeSize = getNodeResizeSize(state.resizeState, connection.fromNodeId);
      const toResizeSize = getNodeResizeSize(state.resizeState, connection.toNodeId);

      return { fromDragOffset, toDragOffset, fromResizeSize, toResizeSize };
    },
    {
      areEqual: (a, b) => {
        if (hasPositionChanged(a.fromDragOffset, b.fromDragOffset)) {
          return false;
        }
        if (hasPositionChanged(a.toDragOffset, b.toDragOffset)) {
          return false;
        }
        if (hasSizeChanged(a.fromResizeSize, b.fromResizeSize)) {
          return false;
        }
        if (hasSizeChanged(a.toResizeSize, b.toResizeSize)) {
          return false;
        }
        return true;
      },
    },
  );

  const { fromDragOffset, toDragOffset, fromResizeSize, toResizeSize } = interactionPreview;

  // Get nodes
  const { fromNode, toNode } = nodesForConnection;

  const safeGetNodePorts = React.useCallback(
    (nodeId: string): CorePort[] => {
      try {
        return getNodePorts(nodeId);
      } catch {
        return [];
      }
    },
    [getNodePorts],
  );

  const fromPortCandidate = safeGetNodePorts(connection.fromNodeId).find((p) => p.id === connection.fromPortId) as
    | CorePort
    | undefined;
  const toPortCandidate = safeGetNodePorts(connection.toNodeId).find((p) => p.id === connection.toPortId) as
    | CorePort
    | undefined;

  const fromPort: CorePort = ensurePort(fromPortCandidate, {
    id: connection.fromPortId,
    nodeId: connection.fromNodeId,
    type: "output",
    label: connection.fromPortId,
    position: "right",
  });
  const toPort: CorePort = ensurePort(toPortCandidate, {
    id: connection.toPortId,
    nodeId: connection.toNodeId,
    type: "input",
    label: connection.toPortId,
    position: "left",
  });

  // Event handlers using useEffectEvent for stable references
  const handlePointerDown = React.useEffectEvent((e: React.PointerEvent, connectionId: string) => {
    if (!fromNode || !toNode) {
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
