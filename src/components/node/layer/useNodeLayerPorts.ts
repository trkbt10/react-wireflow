/**
 * @file Hook for handling port interactions (click, drag, hover).
 */
import * as React from "react";
import { useEditorActionStateActions } from "../../../contexts/composed/EditorActionStateContext";
import { useCanvasInteractionActions } from "../../../contexts/composed/canvas/interaction/context";
import { useNodeCanvasActions, useNodeCanvasUtils } from "../../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitions } from "../../../contexts/node-definitions/context";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { usePortPositions } from "../../../contexts/node-ports/context";
import {
  computeConnectablePortIds,
} from "../../../core/port/connectivity/planner";
import { getPortConnections, getOtherPortInfo } from "../../../core/port/connectivity/queries";
import { createActionPort } from "../../../core/port/identity/variant";
import { PORT_INTERACTION_THRESHOLD } from "../../../constants/interaction";
import type { Port, ConnectionDisconnectState } from "../../../types/core";
import { useConnectionPortResolvers } from "../../../contexts/node-ports/hooks/useConnectionPortResolvers";
import { useConnectionOperations } from "../../../contexts/node-ports/hooks/useConnectionOperations";
import { createEmptyConnectablePorts } from "../../../core/port/connectivity/connectableTypes";

export const useNodeLayerPorts = () => {
  const { actions: actionActions } = useEditorActionStateActions();
  const { actions: interactionActions, getState: getInteractionState } = useCanvasInteractionActions();
  const { getState: getNodeEditorState, actions: nodeEditorActions, getNodePorts } = useNodeEditor();
  const { containerRef } = useNodeCanvasActions();
  const utils = useNodeCanvasUtils();
  const { calculateNodePortPositions } = usePortPositions();
  const { registry } = useNodeDefinitions();
  const { resolveCandidatePort, resolveDisconnectCandidate } = useConnectionPortResolvers();
  const { completeConnectionDrag, completeDisconnectDrag, endConnectionDrag, endConnectionDisconnect } =
    useConnectionOperations();

  const portDragStartRef = React.useRef<{ x: number; y: number; port: Port; hasConnection: boolean } | null>(null);
  const getInteractionStateRef = React.useRef(getInteractionState);
  getInteractionStateRef.current = getInteractionState;
  const getNodeEditorStateRef = React.useRef(getNodeEditorState);
  getNodeEditorStateRef.current = getNodeEditorState;
  const lastHoveredPortIdRef = React.useRef<string | null>(null);

  const handlePortPointerDown = React.useEffectEvent((event: React.PointerEvent, port: Port) => {
    event.stopPropagation();

    const editorState = getNodeEditorStateRef.current();
    const node = editorState.nodes[port.nodeId];
    if (!node) {
      return;
    }

    const nodeWithPorts = {
      ...node,
      ports: getNodePorts(port.nodeId),
    };
    const positions = calculateNodePortPositions(nodeWithPorts);
    const portPositionData = positions.get(port.id);
    const portPosition = portPositionData?.connectionPoint || { x: node.position.x, y: node.position.y };

    const existingConnections = getPortConnections(port, editorState.connections);

    portDragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      port,
      hasConnection: existingConnections.length > 0,
    };

    if (event.pointerType !== "mouse") {
      containerRef.current?.setPointerCapture?.(event.pointerId);
    }

    if (existingConnections.length === 0 || port.type === "output") {
      const actionPort = createActionPort(port);
      interactionActions.startConnectionDrag(actionPort);
      interactionActions.updateConnectionDrag(portPosition, null);
      const connectable = computeConnectablePortIds({
        fallbackPort: actionPort,
        nodes: editorState.nodes,
        connections: editorState.connections,
        getNodePorts,
        getNodeDefinition: (type: string) => registry.get(type),
      });
      actionActions.updateConnectablePorts(connectable);
      return;
    }

    const startDisconnect = () => {
      const connection = existingConnections[0];
      const portInfo = getOtherPortInfo(connection, port, editorState.nodes, getNodePorts);

      if (!portInfo) {
        return;
      }

      const { otherPort, isFromPort } = portInfo;
      const fixedPort = createActionPort(otherPort);
      const disconnectedEnd = isFromPort ? "from" : "to";
      const originalConnectionSnapshot = {
        id: connection.id,
        fromNodeId: connection.fromNodeId,
        fromPortId: connection.fromPortId,
        toNodeId: connection.toNodeId,
        toPortId: connection.toPortId,
      };
      const disconnectState: ConnectionDisconnectState = {
        connectionId: connection.id,
        fixedPort,
        draggingEnd: disconnectedEnd,
        draggingPosition: portPosition,
        originalConnection: originalConnectionSnapshot,
        disconnectedEnd,
        candidatePort: null,
      };

      interactionActions.startConnectionDisconnect(originalConnectionSnapshot, disconnectedEnd, fixedPort, portPosition);

      const disconnectConnectable = computeConnectablePortIds({
        disconnectState,
        nodes: editorState.nodes,
        connections: editorState.connections,
        getNodePorts,
        getNodeDefinition: (type: string) => registry.get(type),
      });
      actionActions.updateConnectablePorts(disconnectConnectable);

      nodeEditorActions.deleteConnection(connection.id);

      portDragStartRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!portDragStartRef.current) {
        return;
      }

      const dx = e.clientX - portDragStartRef.current.x;
      const dy = e.clientY - portDragStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > PORT_INTERACTION_THRESHOLD.DISCONNECT_THRESHOLD) {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerCancel);
        startDisconnect();
      }
    };

    const handlePointerUp = () => {
      portDragStartRef.current = null;
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
      if (event.pointerType !== "mouse") {
        containerRef.current?.releasePointerCapture?.(event.pointerId);
      }
    };

    const handlePointerCancel = () => {
      handlePointerUp();
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
  });

  const handlePortPointerUp = React.useEffectEvent((event: React.PointerEvent, _port: Port) => {
    event.stopPropagation();
    if (event.pointerType !== "mouse") {
      containerRef.current?.releasePointerCapture?.(event.pointerId);
    }

    // Use candidatePort from drag state instead of DOM event target port
    // This ensures snap distance equals connection range
    const interactionState = getInteractionStateRef.current();
    if (interactionState.connectionDisconnectState) {
      const candidatePort = interactionState.connectionDisconnectState.candidatePort;
      if (candidatePort) {
        completeDisconnectDrag(candidatePort);
      }
      endConnectionDisconnect();
      return;
    }

    if (interactionState.connectionDragState) {
      const candidatePort = interactionState.connectionDragState.candidatePort;
      if (candidatePort) {
        completeConnectionDrag(candidatePort);
      }
      endConnectionDrag();
    }
  });

  const handlePortPointerCancel = React.useEffectEvent((event: React.PointerEvent, port: Port) => {
    if (event.pointerType !== "mouse") {
      containerRef.current?.releasePointerCapture?.(event.pointerId);
    }
    handlePortPointerUp(event, port);
  });

  const updatePortHoverState = React.useEffectEvent((clientX: number, clientY: number, fallbackPort: Port) => {
    const interactionState = getInteractionStateRef.current();
    if (interactionState.dragState) {
      return;
    }
    const canvasPosition = utils.screenToCanvas(clientX, clientY);
    const candidate =
      resolveCandidatePort(canvasPosition) || resolveDisconnectCandidate(canvasPosition) || fallbackPort;

    const candidateId = candidate?.id ?? null;
    if (candidateId === lastHoveredPortIdRef.current) {
      return;
    }
    lastHoveredPortIdRef.current = candidateId;
    actionActions.setHoveredPort(candidate);
  });

  const handlePortPointerEnter = React.useEffectEvent((event: React.PointerEvent, port: Port) => {
    const interactionState = getInteractionStateRef.current();
    if (interactionState.dragState) {
      return;
    }
    updatePortHoverState(event.clientX, event.clientY, port);
  });

  const handlePortPointerMove = React.useEffectEvent((event: React.PointerEvent, port: Port) => {
    const interactionState = getInteractionStateRef.current();
    if (interactionState.dragState) {
      return;
    }
    if (!interactionState.connectionDragState && !interactionState.connectionDisconnectState) {
      return;
    }
    updatePortHoverState(event.clientX, event.clientY, port);
  });

  const handlePortPointerLeave = React.useEffectEvent(() => {
    const interactionState = getInteractionStateRef.current();
    if (interactionState.dragState) {
      return;
    }
    actionActions.setHoveredPort(null);
    lastHoveredPortIdRef.current = null;
    if (!interactionState.connectionDragState) {
      actionActions.updateConnectablePorts(createEmptyConnectablePorts());
    }
  });

  return {
    handlePortPointerDown,
    handlePortPointerUp,
    handlePortPointerEnter,
    handlePortPointerMove,
    handlePortPointerLeave,
    handlePortPointerCancel,
  };
};
