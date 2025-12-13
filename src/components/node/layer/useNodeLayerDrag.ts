/**
 * @file Hook for handling node drag interactions.
 */
import * as React from "react";
import { useCanvasInteraction } from "../../../contexts/composed/canvas/interaction/context";
import { useNodeCanvasGridSettings, useNodeCanvasViewportScale } from "../../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { snapMultipleToGrid } from "../../../contexts/composed/node-editor/utils/gridSnap";
import { calculateNewPositions, handleGroupMovement } from "../../../contexts/composed/node-editor/utils/nodeDragHelpers";
import type { UseGroupManagementResult } from "../../../contexts/composed/node-editor/hooks/useGroupManagement";

export const useNodeLayerDrag = (moveGroupWithChildren: UseGroupManagementResult["moveGroupWithChildren"]) => {
  const { state: interactionState, actions: interactionActions } = useCanvasInteraction();
  const { state: nodeEditorState, actions: nodeEditorActions } = useNodeEditor();
  const viewportScale = useNodeCanvasViewportScale();
  const gridSettings = useNodeCanvasGridSettings();
  const nodeDefinitions = useNodeDefinitionList();

  const handlePointerMove = React.useEffectEvent((event: PointerEvent) => {
    if (!interactionState.dragState) {
      return;
    }
    const deltaX = (event.clientX - interactionState.dragState.startPosition.x) / viewportScale;
    const deltaY = (event.clientY - interactionState.dragState.startPosition.y) / viewportScale;

    interactionActions.updateNodeDrag({ x: deltaX, y: deltaY });
  });

  const handlePointerUp = React.useEffectEvent(() => {
    if (!interactionState.dragState) {
      return;
    }
    const { nodeIds, initialPositions, offset } = interactionState.dragState;
    const newPositions = calculateNewPositions(nodeIds, initialPositions, offset);

    const snappedPositions = gridSettings.snapToGrid
      ? snapMultipleToGrid(newPositions, gridSettings, nodeIds[0])
      : newPositions;

    const finalPositions = handleGroupMovement(
      nodeIds,
      nodeEditorState.nodes,
      snappedPositions,
      initialPositions,
      moveGroupWithChildren,
      nodeDefinitions,
    );

    if (Object.keys(finalPositions).length > 0) {
      nodeEditorActions.moveNodes(finalPositions);
    }

    interactionActions.endNodeDrag();
  });

  React.useEffect(() => {
    if (!interactionState.dragState) {
      return;
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interactionState.dragState, handlePointerMove, handlePointerUp]);
};
