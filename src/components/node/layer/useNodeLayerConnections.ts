/**
 * @file Hook for handling connection drag and disconnect interactions.
 */
import * as React from "react";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import {
  useCanvasInteractionActions,
  useCanvasInteractionConnectionDisconnectActive,
  useCanvasInteractionConnectionDragMeta,
} from "../../../contexts/composed/canvas/interaction/context";
import { useNodeCanvasUtils } from "../../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitions } from "../../../contexts/node-definitions/context";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { getConnectableNodeTypes } from "../../../core/port/connectivity/connectability";
import { useConnectionPortResolvers } from "../../../contexts/node-ports/hooks/useConnectionPortResolvers";
import { useConnectionOperations } from "../../../contexts/node-ports/hooks/useConnectionOperations";
import { useRafThrottledCallback } from "../../../hooks/useRafThrottledCallback";
import type { Port, Position } from "../../../types/core";
import { computeConnectablePortIds } from "../../../core/port/connectivity/planner";
import { findNearestConnectablePort } from "../../../core/port/connectivity/candidate";
import { usePortPositions } from "../../../contexts/node-ports/context";
import { useLatestRef } from "../../../hooks/useLatestRef";

export const useNodeLayerConnections = () => {
  const { state: _actionState, actions: actionActions } = useEditorActionState();
  const connectionDragMeta = useCanvasInteractionConnectionDragMeta();
  const isDisconnecting = useCanvasInteractionConnectionDisconnectActive();
  const { actions: interactionActions, getState: getInteractionState } = useCanvasInteractionActions();
  const { state: nodeEditorState, getState: getNodeEditorState, getNodePorts } = useNodeEditor();
  const utils = useNodeCanvasUtils();
  const { registry } = useNodeDefinitions();
  const { resolveCandidatePort, resolveDisconnectCandidate } = useConnectionPortResolvers();
  const { completeConnectionDrag, completeDisconnectDrag, endConnectionDrag, endConnectionDisconnect } =
    useConnectionOperations();
  const { getPortPosition, computePortPosition } = usePortPositions();

  // Connection drag handling
  const resolveCandidatePortRef = useLatestRef(resolveCandidatePort);
  const resolveDisconnectCandidateRef = useLatestRef(resolveDisconnectCandidate);
  const interactionActionsRef = useLatestRef(interactionActions);
  const getInteractionStateRef = useLatestRef(getInteractionState);
  const completeConnectionDragRef = useLatestRef(completeConnectionDrag);
  const completeDisconnectDragRef = useLatestRef(completeDisconnectDrag);
  const endConnectionDragRef = useLatestRef(endConnectionDrag);
  const endConnectionDisconnectRef = useLatestRef(endConnectionDisconnect);
  const actionActionsRef = useLatestRef(actionActions);
  const nodeEditorStateRef = useLatestRef(nodeEditorState);
  const getNodeEditorStateRef = useLatestRef(getNodeEditorState);
  const getNodePortsRef = useLatestRef(getNodePorts);
  const utilsRef = useLatestRef(utils);
  const registryRef = useLatestRef(registry);
  const getPortPositionRef = useLatestRef(getPortPosition);
  const computePortPositionRef = useLatestRef(computePortPosition);

  const resolveConnectionPoint = React.useCallback((nodeId: string, portId: string) => {
    const stored = getPortPositionRef.current(nodeId, portId);
    if (stored) {
      return stored.connectionPoint;
    }
    const editorState = getNodeEditorStateRef.current();
    const node = editorState.nodes[nodeId];
    if (!node) {
      return null;
    }
    const definition = registryRef.current.get(node.type);
    if (!definition) {
      return null;
    }
    const ports = getNodePortsRef.current(nodeId);
    const targetPort = ports.find((candidate) => candidate.id === portId);
    if (!targetPort) {
      return null;
    }
    const computed = computePortPositionRef.current({ ...node, ports }, targetPort);
    return computed.connectionPoint;
  }, []);

  const resolveCandidateFallback = React.useCallback(
    (canvasPosition: Position, fromPort: Port) => {
      const editorState = getNodeEditorStateRef.current();
      const reg = registryRef.current;
      const connectablePorts = computeConnectablePortIds({
        fallbackPort: fromPort,
        nodes: editorState.nodes,
        connections: editorState.connections,
        getNodePorts: getNodePortsRef.current,
        getNodeDefinition: (type: string) => reg.get(type),
      });
      return findNearestConnectablePort({
        pointerCanvasPosition: canvasPosition,
        connectablePorts,
        nodes: editorState.nodes,
        getNodePorts: getNodePortsRef.current,
        getConnectionPoint: resolveConnectionPoint,
        excludePort: { nodeId: fromPort.nodeId, portId: fromPort.id },
      });
    },
    [resolveConnectionPoint],
  );

  const resolveDisconnectFallback = React.useCallback(
    (canvasPosition: Position, fixedPort: Port) => {
      const editorState = getNodeEditorStateRef.current();
      const reg = registryRef.current;
      const connectablePorts = computeConnectablePortIds({
        fallbackPort: fixedPort,
        nodes: editorState.nodes,
        connections: editorState.connections,
        getNodePorts: getNodePortsRef.current,
        getNodeDefinition: (type: string) => reg.get(type),
      });
      return findNearestConnectablePort({
        pointerCanvasPosition: canvasPosition,
        connectablePorts,
        nodes: editorState.nodes,
        getNodePorts: getNodePortsRef.current,
        getConnectionPoint: resolveConnectionPoint,
        excludePort: { nodeId: fixedPort.nodeId, portId: fixedPort.id },
      });
    },
    [resolveConnectionPoint],
  );

  const handleConnectionDragMove = React.useCallback((canvasPosition: Position) => {
    const candidate = resolveCandidatePortRef.current(canvasPosition);
    interactionActionsRef.current.updateConnectionDrag(canvasPosition, candidate);
  }, []);

  const { schedule: scheduleDragMove, cancel: cancelDragMove } = useRafThrottledCallback(handleConnectionDragMove);
  const scheduleDragMoveRef = React.useRef(scheduleDragMove);
  const cancelDragMoveRef = React.useRef(cancelDragMove);
  scheduleDragMoveRef.current = scheduleDragMove;
  cancelDragMoveRef.current = cancelDragMove;

  const handleConnectionDragUp = React.useCallback(() => {
    const drag = getInteractionStateRef.current().connectionDragState;
    if (!drag) {
      endConnectionDragRef.current();
      return;
    }
    const { fromPort, candidatePort, toPosition } = drag;
    if (candidatePort && fromPort.id !== candidatePort.id && completeConnectionDragRef.current(candidatePort)) {
      endConnectionDragRef.current();
      return;
    }

    if (!candidatePort || fromPort.id === candidatePort.id) {
      const screen = utilsRef.current.canvasToScreen(toPosition.x, toPosition.y);
      const editorState = nodeEditorStateRef.current;
      const reg = registryRef.current;
      const allowed = getConnectableNodeTypes({
        fromPort,
        nodes: editorState.nodes,
        connections: editorState.connections,
        getNodeDefinition: (type: string) => reg.get(type),
        getAllNodeDefinitions: () => reg.getAll(),
      });
      actionActionsRef.current.showContextMenu({
        position: { x: screen.x, y: screen.y },
        canvasPosition: { x: toPosition.x, y: toPosition.y },
        mode: "search",
        allowedNodeTypes: allowed,
        fromPort,
      });
    }
    endConnectionDragRef.current();
  }, []);

  React.useLayoutEffect(() => {
    if (!connectionDragMeta) {
      return;
    }

    const toCanvasPosition = (event: PointerEvent) => {
      return utilsRef.current.screenToCanvas(event.clientX, event.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      scheduleDragMoveRef.current(toCanvasPosition(e));
    };

    const handlePointerUp = (e: PointerEvent) => {
      const canvasPosition = toCanvasPosition(e);
      // Keep preview state in sync, but don't rely on it being committed before completion.
      scheduleDragMoveRef.current(canvasPosition, { immediate: true });

      const drag = getInteractionStateRef.current().connectionDragState;
      if (!drag) {
        endConnectionDragRef.current();
        return;
      }

      const resolvedCandidate = resolveCandidatePortRef.current(canvasPosition) ?? resolveCandidateFallback(canvasPosition, drag.fromPort);
      if (resolvedCandidate && drag.fromPort.id !== resolvedCandidate.id && completeConnectionDragRef.current(resolvedCandidate)) {
        endConnectionDragRef.current();
        return;
      }

      if (!resolvedCandidate || drag.fromPort.id === resolvedCandidate.id) {
        const screen = utilsRef.current.canvasToScreen(canvasPosition.x, canvasPosition.y);
        const editorState = getNodeEditorStateRef.current();
        const reg = registryRef.current;
        const allowed = getConnectableNodeTypes({
          fromPort: drag.fromPort,
          nodes: editorState.nodes,
          connections: editorState.connections,
          getNodeDefinition: (type: string) => reg.get(type),
          getAllNodeDefinitions: () => reg.getAll(),
        });
        actionActionsRef.current.showContextMenu({
          position: { x: screen.x, y: screen.y },
          canvasPosition: { x: canvasPosition.x, y: canvasPosition.y },
          mode: "search",
          allowedNodeTypes: allowed,
          fromPort: drag.fromPort,
        });
      }

      endConnectionDragRef.current();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      cancelDragMoveRef.current();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [connectionDragMeta?.fromPort.id, handleConnectionDragUp]);

  // Connection disconnect handling
  const handleDisconnectMove = React.useCallback((canvasPosition: Position) => {
    const candidate = resolveDisconnectCandidateRef.current(canvasPosition);
    interactionActionsRef.current.updateConnectionDisconnect(canvasPosition, candidate);
  }, []);

  const handleDisconnectUp = React.useCallback(() => {
    const disconnectState = getInteractionStateRef.current().connectionDisconnectState;
    if (disconnectState?.candidatePort) {
      completeDisconnectDragRef.current(disconnectState.candidatePort);
    }
    endConnectionDisconnectRef.current();
  }, []);

  const { schedule: scheduleDisconnectMove, cancel: cancelDisconnectMove } = useRafThrottledCallback(handleDisconnectMove);
  const scheduleDisconnectMoveRef = React.useRef(scheduleDisconnectMove);
  const cancelDisconnectMoveRef = React.useRef(cancelDisconnectMove);
  scheduleDisconnectMoveRef.current = scheduleDisconnectMove;
  cancelDisconnectMoveRef.current = cancelDisconnectMove;

  React.useLayoutEffect(() => {
    if (!isDisconnecting) {
      return;
    }

    const toCanvasPosition = (event: PointerEvent) => {
      return utilsRef.current.screenToCanvas(event.clientX, event.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      scheduleDisconnectMoveRef.current(toCanvasPosition(e));
    };

    const handlePointerUp = (e: PointerEvent) => {
      const canvasPosition = toCanvasPosition(e);
      scheduleDisconnectMoveRef.current(canvasPosition, { immediate: true });

      const disconnectState = getInteractionStateRef.current().connectionDisconnectState;
      if (!disconnectState) {
        endConnectionDisconnectRef.current();
        return;
      }

      const resolvedCandidate =
        resolveDisconnectCandidateRef.current(canvasPosition) ??
        resolveDisconnectFallback(canvasPosition, disconnectState.fixedPort);
      if (resolvedCandidate) {
        completeDisconnectDragRef.current(resolvedCandidate);
      }
      endConnectionDisconnectRef.current();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      cancelDisconnectMoveRef.current();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDisconnecting, handleDisconnectUp]);
};
