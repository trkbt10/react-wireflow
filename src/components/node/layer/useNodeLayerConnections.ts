/**
 * @file Hook for handling connection drag and disconnect interactions.
 */
import * as React from "react";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import { useCanvasInteraction } from "../../../contexts/composed/canvas/interaction/context";
import { useNodeCanvasUtils } from "../../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitions } from "../../../contexts/node-definitions/context";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { getConnectableNodeTypes } from "../../../core/port/connectivity/connectability";
import { useConnectionPortResolvers } from "../../../contexts/node-ports/hooks/useConnectionPortResolvers";
import { useConnectionOperations } from "../../../contexts/node-ports/hooks/useConnectionOperations";
import { useRafThrottledCallback } from "../../../hooks/useRafThrottledCallback";

export const useNodeLayerConnections = () => {
  const { state: _actionState, actions: actionActions } = useEditorActionState();
  const { state: interactionState, actions: interactionActions } = useCanvasInteraction();
  const { state: nodeEditorState } = useNodeEditor();
  const utils = useNodeCanvasUtils();
  const { registry } = useNodeDefinitions();
  const { resolveCandidatePort, resolveDisconnectCandidate } = useConnectionPortResolvers();
  const { completeConnectionDrag, completeDisconnectDrag, endConnectionDrag, endConnectionDisconnect } =
    useConnectionOperations();

  // Connection drag handling
  const handleConnectionDragMove = React.useEffectEvent(
    (payload: { canvasPosition: { x: number; y: number }; event: PointerEvent }) => {
      const candidate = resolveCandidatePort(payload.canvasPosition);
      interactionActions.updateConnectionDrag(payload.canvasPosition, candidate);
    },
  );

  const handleConnectionDragUp = React.useEffectEvent(() => {
    const drag = interactionState.connectionDragState;
    if (!drag) {
      endConnectionDrag();
      return;
    }
    const { fromPort, candidatePort, toPosition } = drag;
    if (candidatePort && fromPort.id !== candidatePort.id && completeConnectionDrag(candidatePort)) {
      endConnectionDrag();
      return;
    }

    if (!candidatePort || fromPort.id === candidatePort.id) {
      const screen = utils.canvasToScreen(toPosition.x, toPosition.y);
      const allowed = getConnectableNodeTypes({
        fromPort,
        nodes: nodeEditorState.nodes,
        connections: nodeEditorState.connections,
        getNodeDefinition: (type: string) => registry.get(type),
        getAllNodeDefinitions: () => registry.getAll(),
      });
      actionActions.showContextMenu({
        position: { x: screen.x, y: screen.y },
        canvasPosition: { x: toPosition.x, y: toPosition.y },
        mode: "search",
        allowedNodeTypes: allowed,
        fromPort,
      });
    }
    endConnectionDrag();
  });

  const { schedule: scheduleDragMove, cancel: cancelDragMove } = useRafThrottledCallback(handleConnectionDragMove);
  const scheduleDragMoveRef = React.useRef(scheduleDragMove);
  const cancelDragMoveRef = React.useRef(cancelDragMove);
  scheduleDragMoveRef.current = scheduleDragMove;
  cancelDragMoveRef.current = cancelDragMove;

  React.useEffect(() => {
    if (!interactionState.connectionDragState) {
      return;
    }

    const toCanvasPosition = (event: PointerEvent) => {
      return utils.screenToCanvas(event.clientX, event.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      scheduleDragMoveRef.current({ canvasPosition: toCanvasPosition(e), event: e });
    };

    const handlePointerUp = (e: PointerEvent) => {
      scheduleDragMoveRef.current({ canvasPosition: toCanvasPosition(e), event: e }, { immediate: true });
      handleConnectionDragUp();
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
  }, [interactionState.connectionDragState, utils.screenToCanvas]);

  // Connection disconnect handling
  const handleDisconnectMove = React.useEffectEvent(
    (payload: { canvasPosition: { x: number; y: number }; event: PointerEvent }) => {
      const candidate = resolveDisconnectCandidate(payload.canvasPosition);
      interactionActions.updateConnectionDisconnect(payload.canvasPosition, candidate);
    },
  );

  const handleDisconnectUp = React.useEffectEvent(() => {
    const disconnectState = interactionState.connectionDisconnectState;
    if (disconnectState?.candidatePort) {
      completeDisconnectDrag(disconnectState.candidatePort);
    }
    endConnectionDisconnect();
  });

  const { schedule: scheduleDisconnectMove, cancel: cancelDisconnectMove } =
    useRafThrottledCallback(handleDisconnectMove);
  const scheduleDisconnectMoveRef = React.useRef(scheduleDisconnectMove);
  const cancelDisconnectMoveRef = React.useRef(cancelDisconnectMove);
  scheduleDisconnectMoveRef.current = scheduleDisconnectMove;
  cancelDisconnectMoveRef.current = cancelDisconnectMove;

  React.useEffect(() => {
    if (!interactionState.connectionDisconnectState) {
      return;
    }

    const toCanvasPosition = (event: PointerEvent) => {
      return utils.screenToCanvas(event.clientX, event.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      scheduleDisconnectMoveRef.current({ canvasPosition: toCanvasPosition(e), event: e });
    };

    const handlePointerUp = (e: PointerEvent) => {
      scheduleDisconnectMoveRef.current({ canvasPosition: toCanvasPosition(e), event: e }, { immediate: true });
      handleDisconnectUp();
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
  }, [interactionState.connectionDisconnectState, utils.screenToCanvas]);
};
