/**
 * @file Hook that centralizes canvas pointer event handling with registry-based injections.
 */
import * as React from "react";
import { useNodeCanvas } from "../viewport/context";
import { useEditorActionState } from "../../EditorActionStateContext";
import { useCanvasInteraction } from "./context";
import { useNodeEditor } from "../../node-editor/context";
import { useInteractionSettings } from "../../../interaction-settings/context";
import { usePointerShortcutMatcher } from "../../../interaction-settings/hooks/usePointerShortcutMatcher";
import {
  evaluateCanvasPointerIntent,
  hasExceededCanvasDragThreshold,
  normalizePointerType,
} from "./utils/pointerIntent";
import type { PointerType } from "../../../../types/interaction";
import {
  useCanvasPointerActionRegistry,
  type CanvasPointerEventHandlers,
} from "../pointer-action-context";
import { clampZoomScale } from "../viewport/utils/zoomScale";
import { toggleIds } from "./utils/selectionOperations";
import type { NodeId } from "../../../../types/core";
import { useRafThrottledCallback } from "../../../../hooks/useRafThrottledCallback";

type PinchPointer = {
  clientX: number;
  clientY: number;
  pointerType: PointerType;
};

type PinchState = {
  initialDistance: number;
  initialScale: number;
  lastScale: number;
  center: { x: number; y: number };
};

type PrimaryPointerState = {
  pointerId: number;
  origin: { x: number; y: number };
  intent: ReturnType<typeof evaluateCanvasPointerIntent>;
  status: "pending" | "pan" | "range-select";
} | null;

export type UseCanvasPointerActionsOptions = {
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export type UseCanvasPointerActionsResult = {
  handlers: CanvasPointerEventHandlers;
  isBoxSelecting: boolean;
};

const PINCH_SCALE_EPSILON = 1e-4;

export const useCanvasPointerActions = ({
  containerRef,
}: UseCanvasPointerActionsOptions): UseCanvasPointerActionsResult => {
  const { state: canvasState, actions: canvasActions } = useNodeCanvas();
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const { state: interactionState, actions: interactionActions } = useCanvasInteraction();
  const { state: nodeEditorState } = useNodeEditor();
  const interactionSettings = useInteractionSettings();
  const matchesPointerAction = usePointerShortcutMatcher();
  const { applyInjections } = useCanvasPointerActionRegistry();

  const [isBoxSelecting, setIsBoxSelecting] = React.useState(false);
  const [isPinching, setIsPinching] = React.useState(false);
  const primaryPointerRef = React.useRef<PrimaryPointerState>(null);
  const activePinchPointersRef = React.useRef<Map<number, PinchPointer>>(new Map());
  const pinchStateRef = React.useRef<PinchState | null>(null);
  const initialSelectionRef = React.useRef<NodeId[]>([]);

  const handlePanUpdate = React.useEffectEvent((position: { x: number; y: number }) => {
    canvasActions.updatePan(position);
  });
  const { schedule: schedulePanUpdate, cancel: cancelPanUpdate } = useRafThrottledCallback(handlePanUpdate);
  const schedulePanUpdateRef = React.useRef(schedulePanUpdate);
  const cancelPanUpdateRef = React.useRef(cancelPanUpdate);
  schedulePanUpdateRef.current = schedulePanUpdate;
  cancelPanUpdateRef.current = cancelPanUpdate;

  React.useEffect(() => {
    return () => cancelPanUpdateRef.current();
  }, []);

  const pinchPointerTypes = React.useMemo(() => {
    return new Set(interactionSettings.pinchZoom.pointerTypes);
  }, [interactionSettings.pinchZoom.pointerTypes]);
  const pinchMinDistance = interactionSettings.pinchZoom.minDistance ?? 0;

  const tryStartPinch = React.useEffectEvent((): boolean => {
    if (!interactionSettings.pinchZoom.enabled) {
      return false;
    }

    const container = containerRef.current;
    if (!container) {
      return false;
    }

    const pointers = Array.from(activePinchPointersRef.current.values());
    if (pointers.length !== 2) {
      return false;
    }

    const dx = pointers[1].clientX - pointers[0].clientX;
    const dy = pointers[1].clientY - pointers[0].clientY;
    const distance = Math.hypot(dx, dy);
    if (distance < pinchMinDistance) {
      return false;
    }

    const rect = container.getBoundingClientRect();
    const center = {
      x: (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left,
      y: (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top,
    };

    pinchStateRef.current = {
      initialDistance: distance,
      initialScale: canvasState.viewport.scale,
      lastScale: canvasState.viewport.scale,
      center,
    };

    if (isBoxSelecting) {
      setIsBoxSelecting(false);
      interactionActions.setSelectionBox(null);
    }

    if (canvasState.panState.isPanning) {
      canvasActions.endPan();
    }

    setIsPinching(true);
    return true;
  });

  const updatePinchZoom = React.useEffectEvent(() => {
    const container = containerRef.current;
    const pinchState = pinchStateRef.current;
    if (!container || !pinchState) {
      return;
    }

    const pointers = Array.from(activePinchPointersRef.current.values());
    if (pointers.length < 2) {
      return;
    }

    const dx = pointers[1].clientX - pointers[0].clientX;
    const dy = pointers[1].clientY - pointers[0].clientY;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const center = {
      x: (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left,
      y: (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top,
    };

    const targetScale = clampZoomScale((pinchState.initialScale * distance) / pinchState.initialDistance);

    const scaleDelta = Math.abs(targetScale - pinchState.lastScale);
    if (scaleDelta > PINCH_SCALE_EPSILON) {
      canvasActions.zoomViewport(targetScale, center);
      pinchStateRef.current = {
        ...pinchState,
        lastScale: targetScale,
        center,
      };
      return;
    }

    pinchStateRef.current = {
      ...pinchState,
      center,
    };
  });

  const endPinch = React.useEffectEvent(() => {
    if (!isPinching) {
      return;
    }
    setIsPinching(false);
    pinchStateRef.current = null;
  });

  const pointerTypeFromEvent = React.useEffectEvent((event: React.PointerEvent): PointerType => {
    return normalizePointerType(event.pointerType);
  });

  const handlePointerDown = React.useEffectEvent((e: React.PointerEvent<HTMLDivElement>) => {
    const pointerType = pointerTypeFromEvent(e);

    if (interactionSettings.pinchZoom.enabled && pinchPointerTypes.has(pointerType)) {
      activePinchPointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType,
      });

      if (activePinchPointersRef.current.size === 2 && tryStartPinch()) {
        const container = containerRef.current;
        if (container) {
          container.setPointerCapture(e.pointerId);
        }
        return;
      }
    }

    if (isPinching) {
      return;
    }

    const target = e.target as Element | null;
    const interactiveTarget = target?.closest?.(
      '[data-node-id], [data-port-id], [data-connection-id], button, input, textarea, [role="button"]',
    );

    const intent = evaluateCanvasPointerIntent({
      event: e.nativeEvent,
      pointerType,
      interactiveTarget: Boolean(interactiveTarget),
      isSpacePanning: canvasState.isSpacePanning,
      panActivators: interactionSettings.canvasPanActivators,
      matchesPointerAction,
    });

    if (intent.canRangeSelect) {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const start = { x: screenX, y: screenY };

      setIsBoxSelecting(true);
      interactionActions.setSelectionBox({ start, end: start });
      if (intent.additiveSelection) {
        initialSelectionRef.current = actionState.selectedNodeIds.slice();
      } else {
        initialSelectionRef.current = [];
        actionActions.clearSelection();
      }

      primaryPointerRef.current = {
        pointerId: e.pointerId,
        origin: { x: e.clientX, y: e.clientY },
        intent,
        status: "range-select",
      };

      const container = containerRef.current;
      if (container) {
        container.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (intent.canPan && !intent.canClearSelection) {
      e.preventDefault();
      canvasActions.startPan({ x: e.clientX, y: e.clientY });

      primaryPointerRef.current = {
        pointerId: e.pointerId,
        origin: { x: e.clientX, y: e.clientY },
        intent,
        status: "pan",
      };

      const container = containerRef.current;
      if (container) {
        container.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (intent.canPan || intent.canClearSelection) {
      if (intent.canPan) {
        e.preventDefault();
      }

      primaryPointerRef.current = {
        pointerId: e.pointerId,
        origin: { x: e.clientX, y: e.clientY },
        intent,
        status: "pending",
      };
    }
  });

  const handlePointerMove = React.useEffectEvent((e: React.PointerEvent<HTMLDivElement>) => {
    const pointerType = pointerTypeFromEvent(e);

    if (interactionSettings.pinchZoom.enabled && pinchPointerTypes.has(pointerType)) {
      if (activePinchPointersRef.current.has(e.pointerId)) {
        activePinchPointersRef.current.set(e.pointerId, {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType,
        });
      }
    }

    if (isPinching) {
      e.preventDefault();
      updatePinchZoom();
      return;
    }

    const primaryPointer = primaryPointerRef.current;
    if (primaryPointer && primaryPointer.pointerId === e.pointerId) {
      if (primaryPointer.status === "pending") {
        const currentPosition = { x: e.clientX, y: e.clientY };
        if (primaryPointer.intent.canPan && hasExceededCanvasDragThreshold(primaryPointer.origin, currentPosition)) {
          e.preventDefault();
          canvasActions.startPan(primaryPointer.origin);
          canvasActions.updatePan(currentPosition);
          primaryPointerRef.current = {
            ...primaryPointer,
            status: "pan",
          };

          const container = containerRef.current;
          if (container) {
            container.setPointerCapture(e.pointerId);
          }
          return;
        }

        if (
          primaryPointer.intent.canClearSelection &&
          hasExceededCanvasDragThreshold(primaryPointer.origin, currentPosition)
        ) {
          primaryPointerRef.current = null;
        }
      } else if (primaryPointer.status === "pan") {
        if (pointerType === "touch") {
          e.preventDefault();
        }
        schedulePanUpdateRef.current({ x: e.clientX, y: e.clientY });
        return;
      }
    }

    if (canvasState.panState.isPanning) {
      if (pointerType === "touch") {
        e.preventDefault();
      }
      schedulePanUpdateRef.current({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isBoxSelecting && interactionState.selectionBox) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      interactionActions.setSelectionBox({
        start: interactionState.selectionBox.start,
        end: { x: screenX, y: screenY },
      });
    }
  });

  const handlePointerUp = React.useEffectEvent((e: React.PointerEvent<HTMLDivElement>) => {
    const pointerType = pointerTypeFromEvent(e);

    if (interactionSettings.pinchZoom.enabled && pinchPointerTypes.has(pointerType)) {
      if (activePinchPointersRef.current.has(e.pointerId)) {
        activePinchPointersRef.current.delete(e.pointerId);
      }

      const container = containerRef.current;
      if (container) {
        container.releasePointerCapture(e.pointerId);
      }

      if (activePinchPointersRef.current.size < 2) {
        endPinch();
      }

      if (isPinching) {
        return;
      }
    }

    const primaryPointer = primaryPointerRef.current;
    if (primaryPointer && primaryPointer.pointerId === e.pointerId) {
      if (primaryPointer.status === "pan") {
        schedulePanUpdateRef.current({ x: e.clientX, y: e.clientY }, { immediate: true });
        canvasActions.endPan();
        primaryPointerRef.current = null;

        const container = containerRef.current;
        if (container) {
          container.releasePointerCapture(e.pointerId);
        }
        return;
      }

      if (primaryPointer.status === "pending" && primaryPointer.intent.canClearSelection) {
        primaryPointerRef.current = null;
        actionActions.clearSelection();
        return;
      }

      primaryPointerRef.current = null;
    } else if (canvasState.panState.isPanning) {
      schedulePanUpdateRef.current({ x: e.clientX, y: e.clientY }, { immediate: true });
      canvasActions.endPan();

      const container = containerRef.current;
      if (container) {
        container.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (isBoxSelecting && interactionState.selectionBox) {
      setIsBoxSelecting(false);

      const { start, end } = interactionState.selectionBox;
      const canvasStartX = (start.x - canvasState.viewport.offset.x) / canvasState.viewport.scale;
      const canvasStartY = (start.y - canvasState.viewport.offset.y) / canvasState.viewport.scale;
      const canvasEndX = (end.x - canvasState.viewport.offset.x) / canvasState.viewport.scale;
      const canvasEndY = (end.y - canvasState.viewport.offset.y) / canvasState.viewport.scale;

      const minX = Math.min(canvasStartX, canvasEndX);
      const maxX = Math.max(canvasStartX, canvasEndX);
      const minY = Math.min(canvasStartY, canvasEndY);
      const maxY = Math.max(canvasStartY, canvasEndY);

      const nodesInBox: NodeId[] = [];
      Object.values(nodeEditorState.nodes).forEach((node) => {
        const nodeWidth = node.size?.width ?? 150;
        const nodeHeight = node.size?.height ?? 50;

        const intersects =
          node.position.x < maxX &&
          node.position.x + nodeWidth > minX &&
          node.position.y < maxY &&
          node.position.y + nodeHeight > minY;

        if (intersects) {
          nodesInBox.push(node.id);
        }
      });

      const additiveSelection = matchesPointerAction("node-add-to-selection", e.nativeEvent);
      const uniqueNodeIds = Array.from(new Set(nodesInBox));

      if (additiveSelection) {
        const baseSelection =
          initialSelectionRef.current.length > 0 ? initialSelectionRef.current : actionState.selectedNodeIds;
        const toggled = toggleIds(baseSelection, uniqueNodeIds);
        actionActions.setInteractionSelection(toggled);
        actionActions.setEditingSelection(toggled);
      } else if (uniqueNodeIds.length > 0) {
        actionActions.setInteractionSelection(uniqueNodeIds);
        actionActions.setEditingSelection(uniqueNodeIds);
      } else {
        actionActions.clearSelection();
      }

      interactionActions.setSelectionBox(null);
      initialSelectionRef.current = [];

      const container = containerRef.current;
      if (container) {
        container.releasePointerCapture(e.pointerId);
      }
    }
  });

  const handlePointerCancel = React.useEffectEvent((e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerUp(e);
  });

  const baseHandlers = React.useMemo<CanvasPointerEventHandlers>(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    }),
    [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel],
  );

  const handlers = React.useMemo(() => applyInjections(baseHandlers), [applyInjections, baseHandlers]);

  return {
    handlers,
    isBoxSelecting,
  };
};

/*
debug-notes:
- Studied src/components/canvas/CanvasBase.tsx to migrate pointer state management into a dedicated hook while preserving selection and pan behaviors.
- Reviewed src/utils/canvasPointerIntent.ts to ensure intent evaluation semantics remain intact during the refactor.
- Consulted src/hooks/usePointerShortcutMatcher.ts to keep shortcut matching consistent when exposing handlers through the registry.
*/
