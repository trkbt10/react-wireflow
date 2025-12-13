/**
 * @file Port-level interaction handler used by the connection system.
 */
import * as React from "react";
import type { Port, NodeId, Position } from "../../types/core";
import { useNodeEditor } from "../../contexts/composed/node-editor/context";
import { useEditorActionState } from "../../contexts/composed/EditorActionStateContext";
import { useCanvasInteraction } from "../../contexts/composed/canvas/interaction/context";
import { useNodeCanvasUtils } from "../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitions } from "../../contexts/node-definitions/context";
import { usePointerDrag } from "../../hooks/usePointerDrag";
import { createActionPort } from "../../core/port/identity/variant";
import { createPortKey } from "../../core/port/identity/key";
import { isPortConnectable } from "../../core/port/connectivity/connectableTypes";
import { computeConnectablePortIds } from "../../core/port/connectivity/planner";
import { useConnectionOperations } from "../../contexts/node-ports/hooks/useConnectionOperations";
import { useConnectionPortResolvers } from "../../contexts/node-ports/hooks/useConnectionPortResolvers";
import { PORT_INTERACTION_THRESHOLD } from "../../constants/interaction";

export type PortInteractionHandlerProps = {
  port: Port;
  node: { id: NodeId; position: Position };
  children: (props: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    isHovered: boolean;
    isConnecting: boolean;
    isConnectable: boolean;
    isCandidate: boolean;
    isConnected: boolean;
  }) => React.ReactNode;
};

/**
 * Handles all port interaction logic including connections and hover states
 */
export const PortInteractionHandler: React.FC<PortInteractionHandlerProps> = ({ port, children }) => {
  const { state: nodeEditorState, getNodePorts } = useNodeEditor();
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const { state: interactionState, actions: interactionActions } = useCanvasInteraction();
  const utils = useNodeCanvasUtils();
  const { registry } = useNodeDefinitions();
  const { completeConnectionDrag, endConnectionDrag } = useConnectionOperations();
  const { resolveCandidatePort } = useConnectionPortResolvers();

  // Check port states
  const isHovered = actionState.hoveredPort?.id === port.id;
  const isConnecting = interactionState.connectionDragState?.fromPort.id === port.id;
  const isConnectable = isPortConnectable(port, actionState.connectablePorts);
  const isCandidate = interactionState.connectionDragState?.candidatePort?.id === port.id;
  const isConnected = actionState.connectedPorts.has(createPortKey(port.nodeId, port.id));

  // Convert to Port for actions using factory to ensure all properties are copied
  const actionPort = React.useMemo<Port>(() => createActionPort(port), [port]);

  // Handle connection drag
  const handleConnectionDragStartImpl = React.useEffectEvent((_event: PointerEvent, _portElement: HTMLElement) => {
    // Calculate connectable ports using resolved ports and NodeDefinitions
    const connectablePorts = computeConnectablePortIds({
      fallbackPort: actionPort,
      nodes: nodeEditorState.nodes,
      connections: nodeEditorState.connections,
      getNodePorts,
      getNodeDefinition: (type: string) => registry.get(type),
    });

    // Start connection drag and update connectable ports
    interactionActions.startConnectionDrag(actionPort);
    actionActions.updateConnectablePorts(connectablePorts);
  });

  const handleConnectionDragStart = React.useCallback((event: PointerEvent, portElement: HTMLElement) => {
    handleConnectionDragStartImpl(event, portElement);
  }, []);

  const handleConnectionDragMoveImpl = React.useEffectEvent((event: PointerEvent, _delta: Position) => {
    const canvasPos = utils.screenToCanvas(event.clientX, event.clientY);
    const candidate = resolveCandidatePort(canvasPos);
    interactionActions.updateConnectionDrag(canvasPos, candidate);
  });

  const handleConnectionDragMove = React.useCallback((event: PointerEvent, delta: Position) => {
    handleConnectionDragMoveImpl(event, delta);
  }, []);

  const handleConnectionDragEndImpl = React.useEffectEvent((_event: PointerEvent, _delta: Position) => {
    const candidatePort = interactionState.connectionDragState?.candidatePort;
    if (candidatePort) {
      completeConnectionDrag(candidatePort);
    }
    endConnectionDrag();
  });

  const handleConnectionDragEnd = React.useCallback((event: PointerEvent, delta: Position) => {
    handleConnectionDragEndImpl(event, delta);
  }, []);

  const { startDrag } = usePointerDrag({
    onStart: handleConnectionDragStart,
    onMove: handleConnectionDragMove,
    onEnd: handleConnectionDragEnd,
    threshold: PORT_INTERACTION_THRESHOLD.NEW_CONNECTION_THRESHOLD,
  });

  // Event handlers
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const portElement = e.currentTarget as HTMLElement;
      startDrag(e, portElement);
    },
    [startDrag],
  );

  const handlePointerEnterImpl = React.useEffectEvent((_event: React.PointerEvent) => {
    actionActions.setHoveredPort(actionPort);
  });

  const handlePointerEnter = React.useCallback((event: React.PointerEvent) => {
    handlePointerEnterImpl(event);
  }, []);

  const handlePointerLeaveImpl = React.useEffectEvent((_event: React.PointerEvent) => {
    actionActions.setHoveredPort(null);
  });

  const handlePointerLeave = React.useCallback((event: React.PointerEvent) => {
    handlePointerLeaveImpl(event);
  }, []);

  return (
    <>
      {children({
        onPointerDown: handlePointerDown,
        onPointerEnter: handlePointerEnter,
        onPointerLeave: handlePointerLeave,
        isHovered,
        isConnecting,
        isConnectable,
        isCandidate,
        isConnected,
      })}
    </>
  );
};

/*
debug-notes:
- Reviewed src/components/node/NodeLayer.tsx to ensure pointer utilities remain compatible with node-layer dataset selectors.
- Reviewed src/examples/demos/advanced/subeditor/SubEditorWindow.tsx to confirm nested editors encapsulate their own canvas providers and require local screenToCanvas conversions.
- Reviewed src/contexts/NodeCanvasContext.tsx to reuse screenToCanvas logic instead of querying the global node layer.
*/
