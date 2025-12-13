/**
 * @file Selection + context-menu interactions sourced from editor contexts.
 */
import * as React from "react";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import { useCanvasInteraction } from "../../../contexts/composed/canvas/interaction/context";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { useNodeCanvasUtils } from "../../../contexts/composed/canvas/viewport/context";
import { useInteractionSettings } from "../../../contexts/interaction-settings/context";
import type { PointerType } from "../../../types/interaction";
import { usePointerShortcutMatcher } from "../../../contexts/interaction-settings/hooks/usePointerShortcutMatcher";
import { useNodeDefinitions } from "../../../contexts/node-definitions/context";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import type { UseGroupManagementResult } from "../../../contexts/composed/node-editor/hooks/useGroupManagement";
import { addUniqueIds } from "../../../utils/selectionUtils";
import { getNodesToDrag, collectInitialPositions } from "../../../contexts/composed/node-editor/utils/nodeDragHelpers";

export type NodeSelectionHandlers = {
  handleNodePointerDown: (event: React.PointerEvent, nodeId: string, isDragAllowed?: boolean) => void;
  handleNodeContextMenu: (event: React.MouseEvent, nodeId: string) => void;
};

export type UseNodeSelectionInteractionsOptions = {
  getGroupChildren?: UseGroupManagementResult["getGroupChildren"];
};

const noopGetGroupChildren: UseGroupManagementResult["getGroupChildren"] = () => [];

export const useNodeSelectionInteractions = (
  options: UseNodeSelectionInteractionsOptions = {},
): NodeSelectionHandlers => {
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const { state: _interactionState, actions: interactionActions } = useCanvasInteraction();
  const { state: nodeEditorState } = useNodeEditor();
  const utils = useNodeCanvasUtils();
  const interactionSettings = useInteractionSettings();
  const matchesPointerAction = usePointerShortcutMatcher();
  const { registry: nodeDefinitionRegistry } = useNodeDefinitions();
  const nodeDefinitionList = useNodeDefinitionList();
  const getGroupChildren = options.getGroupChildren ?? noopGetGroupChildren;

  const handleNodeContextMenu = React.useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      const nativeEvent = event.nativeEvent as MouseEvent & { pointerType?: string };
      if (!matchesPointerAction("node-open-context-menu", nativeEvent)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pointerType: PointerType | "unknown" =
        nativeEvent.pointerType === "mouse" || nativeEvent.pointerType === "touch" || nativeEvent.pointerType === "pen"
          ? (nativeEvent.pointerType as PointerType)
          : "unknown";

      const screenPosition = { x: event.clientX, y: event.clientY };
      const canvasPosition = utils.screenToCanvas(event.clientX, event.clientY);

      const defaultShow = () => actionActions.showContextMenu({ position: screenPosition, nodeId, canvasPosition });

      const handler = interactionSettings.contextMenu.handleRequest;
      if (handler) {
        handler({
          target: { kind: "node", nodeId },
          screenPosition,
          canvasPosition,
          pointerType,
          event: nativeEvent,
          defaultShow,
        });
        return;
      }

      defaultShow();
    },
    [matchesPointerAction, utils, actionActions, interactionSettings.contextMenu.handleRequest],
  );

  const handleNodePointerDown = React.useCallback(
    (event: React.PointerEvent, targetNodeId: string, isDragAllowed: boolean = true) => {
      const nativeEvent = event.nativeEvent;
      const matchesMultiSelect = matchesPointerAction("node-add-to-selection", nativeEvent);
      const matchesSelect = matchesPointerAction("node-select", nativeEvent) || matchesMultiSelect;

      if (!matchesSelect && !matchesMultiSelect) {
        return;
      }

      event.stopPropagation();
      const isInputElement =
        event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName);
      if (isInputElement) {
        return;
      }

      const clickedNode = nodeEditorState.nodes[targetNodeId];
      const wasSelected = actionState.selectedNodeIds.includes(targetNodeId);
      const hadMultipleSelection = actionState.selectedNodeIds.length > 1;

      if (matchesMultiSelect) {
        actionActions.selectEditingNode(targetNodeId, true);
        actionActions.selectInteractionNode(targetNodeId, true);
        if (wasSelected) {
          return;
        }
      } else if (!wasSelected || !hadMultipleSelection) {
        actionActions.selectEditingNode(targetNodeId, false);
        actionActions.selectInteractionNode(targetNodeId, false);
      }

      if (clickedNode?.locked) {
        return;
      }

      const nodeDefinition = clickedNode ? nodeDefinitionRegistry.get(clickedNode.type) : undefined;
      const isInteractive = nodeDefinition?.interactive || false;

      if (isInteractive && !isDragAllowed && !wasSelected) {
        return;
      }

      const effectiveSelection = matchesMultiSelect
        ? addUniqueIds(actionState.selectedNodeIds, [targetNodeId])
        : wasSelected && hadMultipleSelection
          ? actionState.selectedNodeIds
          : [targetNodeId];

      const nodesToDrag = getNodesToDrag(
        targetNodeId,
        matchesMultiSelect,
        effectiveSelection,
        nodeEditorState.nodes,
        isInteractive,
        isDragAllowed,
      );

      if (nodesToDrag.length === 0) {
        return;
      }

      const startPosition = { x: event.clientX, y: event.clientY };
      const { initialPositions, affectedChildNodes } = collectInitialPositions(
        nodesToDrag,
        nodeEditorState.nodes,
        getGroupChildren,
        nodeDefinitionList,
      );

      interactionActions.startNodeDrag(nodesToDrag, startPosition, initialPositions, affectedChildNodes);
    },
    [
      matchesPointerAction,
      nodeEditorState.nodes,
      actionState.selectedNodeIds,
      nodeDefinitionRegistry,
      nodeDefinitionList,
      getGroupChildren,
      actionActions,
    ],
  );

  return {
    handleNodePointerDown,
    handleNodeContextMenu,
  };
};
