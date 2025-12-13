/**
 * @file Hook for handling node drag interactions.
 */
import * as React from "react";
import { flushSync } from "react-dom";
import { useCanvasInteractionActions, useCanvasInteractionDragState } from "../../../contexts/composed/canvas/interaction/context";
import { useNodeCanvasGridSettings, useNodeCanvasViewportScale } from "../../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { snapMultipleToGrid } from "../../../contexts/composed/node-editor/utils/gridSnap";
import { calculateNewPositions, handleGroupMovement } from "../../../contexts/composed/node-editor/utils/nodeDragHelpers";
import type { UseGroupManagementResult } from "../../../contexts/composed/node-editor/hooks/useGroupManagement";
import { useRafThrottledCallback } from "../../../hooks/useRafThrottledCallback";
import type { DragState, Position } from "../../../types/core";

export const useNodeLayerDrag = (moveGroupWithChildren: UseGroupManagementResult["moveGroupWithChildren"]) => {
  const dragState = useCanvasInteractionDragState();
  const { actions: interactionActions } = useCanvasInteractionActions();
  const { state: nodeEditorState, actions: nodeEditorActions } = useNodeEditor();
  const viewportScale = useNodeCanvasViewportScale();
  const gridSettings = useNodeCanvasGridSettings();
  const nodeDefinitions = useNodeDefinitionList();

  const dragStateRef = React.useRef<DragState | null>(dragState);
  const viewportScaleRef = React.useRef(viewportScale);
  const gridSettingsRef = React.useRef(gridSettings);
  const nodeEditorNodesRef = React.useRef(nodeEditorState.nodes);
  const nodeDefinitionsRef = React.useRef(nodeDefinitions);
  const moveGroupWithChildrenRef = React.useRef(moveGroupWithChildren);
  const nodeEditorActionsRef = React.useRef(nodeEditorActions);
  const interactionActionsRef = React.useRef(interactionActions);

  dragStateRef.current = dragState;
  viewportScaleRef.current = viewportScale;
  gridSettingsRef.current = gridSettings;
  nodeEditorNodesRef.current = nodeEditorState.nodes;
  nodeDefinitionsRef.current = nodeDefinitions;
  moveGroupWithChildrenRef.current = moveGroupWithChildren;
  nodeEditorActionsRef.current = nodeEditorActions;
  interactionActionsRef.current = interactionActions;

  const updateDragOffset = React.useCallback((offset: Position) => {
    interactionActionsRef.current.updateNodeDrag(offset);
  }, []);
  const { schedule: scheduleDragOffset, cancel: cancelDragOffset } = useRafThrottledCallback(updateDragOffset);
  const scheduleDragOffsetRef = React.useRef(scheduleDragOffset);
  const cancelDragOffsetRef = React.useRef(cancelDragOffset);
  scheduleDragOffsetRef.current = scheduleDragOffset;
  cancelDragOffsetRef.current = cancelDragOffset;

  const handlePointerMove = React.useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    const scale = viewportScaleRef.current;
    const deltaX = (event.clientX - dragState.startPosition.x) / scale;
    const deltaY = (event.clientY - dragState.startPosition.y) / scale;

    scheduleDragOffsetRef.current({ x: deltaX, y: deltaY });
  }, []);

  const handlePointerUp = React.useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    cancelDragOffsetRef.current();

    const { nodeIds, initialPositions, offset } = dragState;
    const newPositions = calculateNewPositions(nodeIds, initialPositions, offset);

    const currentGridSettings = gridSettingsRef.current;
    const snappedPositions = currentGridSettings.snapToGrid
      ? snapMultipleToGrid(newPositions, currentGridSettings, nodeIds[0])
      : newPositions;

    const finalPositions = handleGroupMovement(
      nodeIds,
      nodeEditorNodesRef.current,
      snappedPositions,
      initialPositions,
      moveGroupWithChildrenRef.current,
      nodeDefinitionsRef.current,
    );

    flushSync(() => {
      if (Object.keys(finalPositions).length > 0) {
        nodeEditorActionsRef.current.moveNodes(finalPositions);
      }
      interactionActionsRef.current.endNodeDrag();
    });
  }, []);

  React.useEffect(() => {
    if (!dragState) {
      return;
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      cancelDragOffsetRef.current();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState ? true : false, handlePointerMove, handlePointerUp]);
};
