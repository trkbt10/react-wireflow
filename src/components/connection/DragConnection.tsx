/**
 * @file DragConnection component
 * Renders the preview connection line during drag operations (connecting or disconnecting).
 */
import * as React from "react";
import { useCanvasInteraction } from "../../contexts/composed/canvas/interaction/context";
import { useNodeEditorApi, useNodeEditorSelector } from "../../contexts/composed/node-editor/context";
import { useNodeDefinitions } from "../../contexts/node-definitions/context";
import { useDynamicConnectionPoint } from "../../contexts/node-ports/hooks/usePortPosition";
import type { ConnectionEndpoints } from "../../core/connection/endpoints";
import { useConnectionPathData } from "./ConnectionPath";
import type { ConnectionRenderContext } from "../../types/NodeDefinition";
import type { ConnectionPathCalculationContext } from "../../types/connectionBehavior";
import type { Connection, Node as EditorNode, Port as CorePort } from "../../types/core";
import styles from "./DragConnection.module.css";

// ============================================================================
// Types
// ============================================================================

type DragVariant = "connecting" | "disconnecting";

/**
 * Normalized connection parameters.
 * Connections always flow from output port to input port.
 */
type DragConnectionParams = {
  variant: DragVariant;
  /**
   * Connection endpoints used for drawing.
   * For previews, this represents the dragged port → pointer/candidate direction.
   */
  endpoints: ConnectionEndpoints;
  /** Drag source port */
  outputPort: CorePort | undefined;
  /** Drag target port (undefined while hovering empty space) */
  inputPort: CorePort | undefined;
  /** Node containing the drag source port */
  outputNode: EditorNode | undefined;
  /** Node containing the drag target port */
  inputNode: EditorNode | undefined;
  connection: Connection | null;
};

// ============================================================================
// Shared utilities
// ============================================================================

const EMPTY_PREVIEW_HANDLERS = {
  onPointerDown: (_event: React.PointerEvent) => {},
  onPointerEnter: (_event: React.PointerEvent) => {},
  onPointerLeave: (_event: React.PointerEvent) => {},
  onContextMenu: (_event?: React.MouseEvent) => {},
} as const;

type CustomConnectionRenderer = NonNullable<
  ReturnType<ReturnType<typeof useNodeDefinitions>["getPortDefinition"]>
>["renderConnection"];

const resolveConnectionRenderer = (
  getPortDefinition: ReturnType<typeof useNodeDefinitions>["getPortDefinition"],
  primaryPort: CorePort | undefined,
  primaryNode: EditorNode | undefined,
  fallbackPort?: CorePort,
  fallbackNode?: EditorNode,
): CustomConnectionRenderer | null => {
  if (primaryPort && primaryNode) {
    const definition = getPortDefinition(primaryPort, primaryNode.type);
    if (definition?.renderConnection) {
      return definition.renderConnection;
    }
  }
  if (fallbackPort && fallbackNode) {
    const definition = getPortDefinition(fallbackPort, fallbackNode.type);
    if (definition?.renderConnection) {
      return definition.renderConnection;
    }
  }
  return null;
};

// ============================================================================
// Hooks for extracting drag parameters
// ============================================================================

const useConnectingParams = (): DragConnectionParams | null => {
  const { state: interactionState } = useCanvasInteraction();
  const { getNodePorts } = useNodeEditorApi();

  const dragState = interactionState.connectionDragState;

  const dragStartNodeId = dragState?.fromPort.nodeId ?? "";
  const dragStartPortId = dragState?.fromPort.id ?? "";
  const candidateNodeId = dragState?.candidatePort?.nodeId ?? "";
  const candidatePortId = dragState?.candidatePort?.id ?? "";

  const dragStartPos = useDynamicConnectionPoint(dragStartNodeId, dragStartPortId);
  const candidatePos = useDynamicConnectionPoint(candidateNodeId, candidatePortId);

  const dragStartNode = useNodeEditorSelector((state) => state.nodes[dragStartNodeId], { areEqual: (a, b) => a === b });
  const candidateNode = useNodeEditorSelector((state) => state.nodes[candidateNodeId], { areEqual: (a, b) => a === b });

  const safeFindPort = React.useCallback((nodeId: string, portId: string): CorePort | undefined => {
    if (!nodeId || !portId) {
      return undefined;
    }
    try {
      return getNodePorts(nodeId).find((p) => p.id === portId);
    } catch {
      return undefined;
    }
  }, [getNodePorts]);

  if (!dragState || !dragStartPos || !dragStartNode) {
    return null;
  }

  const dragStartPort = safeFindPort(dragStartNodeId, dragStartPortId) ?? dragState.fromPort;
  const candidatePort = safeFindPort(candidateNodeId, candidatePortId) ?? dragState.candidatePort ?? undefined;
  const candidatePosition = candidatePort && candidatePos ? candidatePos : dragState.toPosition;

  return {
    variant: "connecting",
    endpoints: {
      outputPosition: { x: dragStartPos.x, y: dragStartPos.y },
      inputPosition: { x: candidatePosition.x, y: candidatePosition.y },
    },
    outputPort: dragStartPort,
    inputPort: candidatePort,
    outputNode: dragStartNode,
    inputNode: candidateNode,
    connection: null,
  };
};

const useDisconnectingParams = (): DragConnectionParams | null => {
  const { state: interactionState } = useCanvasInteraction();
  const { getNodePorts } = useNodeEditorApi();

  const disconnectState = interactionState.connectionDisconnectState;
  const connectionId = disconnectState?.connectionId ?? "";
  const fixedNodeId = disconnectState?.fixedPort.nodeId ?? "";
  const fixedPortId = disconnectState?.fixedPort.id ?? "";
  const candidateNodeId = disconnectState?.candidatePort?.nodeId ?? "";
  const candidatePortId = disconnectState?.candidatePort?.id ?? "";

  const fixedPos = useDynamicConnectionPoint(fixedNodeId, fixedPortId);
  const candidatePos = useDynamicConnectionPoint(candidateNodeId, candidatePortId);

  const storedConnection = useNodeEditorSelector(
    (state) => (connectionId ? state.connections[connectionId] : undefined),
    { areEqual: (a, b) => a === b },
  );

  const baseConnection = storedConnection ?? disconnectState?.originalConnection ?? null;

  const safeFindPort = React.useCallback((nodeId: string, portId: string): CorePort | undefined => {
    if (!nodeId || !portId) {
      return undefined;
    }
    try {
      return getNodePorts(nodeId).find((p) => p.id === portId);
    } catch {
      return undefined;
    }
  }, [getNodePorts]);

  const fromNodeId = baseConnection?.fromNodeId ?? "";
  const toNodeId = baseConnection?.toNodeId ?? "";

  const outputNode = useNodeEditorSelector((state) => state.nodes[fromNodeId], { areEqual: (a, b) => a === b });
  const inputNode = useNodeEditorSelector((state) => state.nodes[toNodeId], { areEqual: (a, b) => a === b });
  const candidateNode = useNodeEditorSelector((state) => state.nodes[candidateNodeId], { areEqual: (a, b) => a === b });

  if (!disconnectState || !fixedPos || !baseConnection) {
    return null;
  }

  const originalOutputPort = safeFindPort(baseConnection.fromNodeId, baseConnection.fromPortId);
  const originalInputPort = safeFindPort(baseConnection.toNodeId, baseConnection.toPortId);

  if (!originalOutputPort || !originalInputPort) {
    return null;
  }

  if (!outputNode || !inputNode) {
    return null;
  }

  const candidatePort = safeFindPort(candidateNodeId, candidatePortId) ?? disconnectState.candidatePort ?? undefined;

  const draggingPosition = disconnectState.draggingPosition;
  const candidatePosition = candidatePort && candidatePos ? candidatePos : draggingPosition;

  // draggingEnd === "from" means dragging the output side
  const isDraggingOutput = disconnectState.draggingEnd === "from";

  const outputPosition = isDraggingOutput
    ? { x: candidatePosition.x, y: candidatePosition.y }
    : { x: fixedPos.x, y: fixedPos.y };
  const inputPosition = isDraggingOutput
    ? { x: fixedPos.x, y: fixedPos.y }
    : { x: candidatePosition.x, y: candidatePosition.y };

  return {
    variant: "disconnecting",
    endpoints: { outputPosition, inputPosition },
    outputPort: isDraggingOutput ? (candidatePort ?? originalOutputPort) : originalOutputPort,
    outputNode: isDraggingOutput ? (candidateNode ?? outputNode) : outputNode,
    inputPort: isDraggingOutput ? originalInputPort : (candidatePort ?? originalInputPort),
    inputNode: isDraggingOutput ? inputNode : (candidateNode ?? inputNode),
    connection: baseConnection,
  };
};

// ============================================================================
// Main Component
// ============================================================================

const DragConnectionComponent: React.FC = () => {
  const { getPortDefinition } = useNodeDefinitions();

  const connectingParams = useConnectingParams();
  const disconnectingParams = useDisconnectingParams();

  const params = connectingParams ?? disconnectingParams;

  // Use shared path calculation - must be called before any early returns (Rules of Hooks)
  const pathCalculationContext = React.useMemo<
    Omit<ConnectionPathCalculationContext, "outputPosition" | "inputPosition">
  >(() => {
    if (!params) {
      return {};
    }
    return {
      connection: params.connection,
      outputNode: params.outputNode,
      inputNode: params.inputNode,
      outputPort: params.outputPort,
      inputPort: params.inputPort,
    };
  }, [params]);

  const pathData = useConnectionPathData(
    params?.endpoints.outputPosition ?? { x: 0, y: 0 },
    params?.endpoints.inputPosition ?? { x: 0, y: 0 },
    pathCalculationContext,
  );

  if (!params) {
    return null;
  }

  const {
    variant,
    endpoints,
    outputPort,
    inputPort,
    outputNode,
    inputNode,
    connection,
  } = params;

  const renderer = resolveConnectionRenderer(getPortDefinition, outputPort, outputNode, inputPort, inputNode);

  const defaultRender = () => (
    <g className={styles.dragGroup} data-drag-state={variant} shapeRendering="geometricPrecision">
      <path d={pathData} className={styles.dragPath} data-drag-variant={variant} />
    </g>
  );

  // Use default rendering if output port/node is not resolved yet
  if (!renderer || !outputPort || !outputNode) {
    return defaultRender();
  }

  // ConnectionRenderContext for custom renderers
  const previewContext: ConnectionRenderContext = {
    connection,
    phase: variant,
    fromPort: outputPort,
    toPort: inputPort,
    fromNode: outputNode,
    toNode: inputNode,
    fromPosition: endpoints.outputPosition,
    toPosition: endpoints.inputPosition,
    isSelected: false,
    isHovered: false,
    isAdjacentToSelectedNode: false,
    isDragging: true,
    dragProgress: undefined,
    handlers: EMPTY_PREVIEW_HANDLERS,
  };

  return renderer(previewContext, defaultRender);
};

export const DragConnection = React.memo(DragConnectionComponent);
DragConnection.displayName = "DragConnection";
