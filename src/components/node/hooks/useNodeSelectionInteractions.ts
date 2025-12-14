/**
 * @file Selection + context-menu interactions sourced from editor contexts.
 */
import * as React from "react";
import { useEditorActionStateActions, useEditorActionStateState } from "../../../contexts/composed/EditorActionStateContext";
import { useCanvasInteractionActions } from "../../../contexts/composed/canvas/interaction/context";
import { useNodeEditorApi } from "../../../contexts/composed/node-editor/context";
import { useNodeCanvasUtils } from "../../../contexts/composed/canvas/viewport/context";
import { useInteractionSettings } from "../../../contexts/interaction-settings/context";
import type { PointerType } from "../../../types/interaction";
import { usePointerShortcutMatcher } from "../../../contexts/interaction-settings/hooks/usePointerShortcutMatcher";
import { useNodeDefinitions } from "../../../contexts/node-definitions/context";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import type { UseGroupManagementResult } from "../../../contexts/composed/node-editor/hooks/useGroupManagement";
import { addUniqueIds } from "../../../utils/selectionUtils";
import { getNodesToDrag, collectInitialPositions } from "../../../contexts/composed/node-editor/utils/nodeDragHelpers";
import { useLatestRef } from "../../../hooks/useLatestRef";

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
  const actionState = useEditorActionStateState();
  const { actions: actionActions } = useEditorActionStateActions();
  const { actions: interactionActions } = useCanvasInteractionActions();
  const { getState: getNodeEditorState } = useNodeEditorApi();
  const utils = useNodeCanvasUtils();
  const interactionSettings = useInteractionSettings();
  const matchesPointerAction = usePointerShortcutMatcher();
  const { registry: nodeDefinitionRegistry } = useNodeDefinitions();
  const nodeDefinitionList = useNodeDefinitionList();
  const getGroupChildren = options.getGroupChildren ?? noopGetGroupChildren;

  const actionStateRef = useLatestRef(actionState);
  const getNodeEditorStateRef = useLatestRef(getNodeEditorState);
  const nodeDefinitionRegistryRef = useLatestRef(nodeDefinitionRegistry);
  const nodeDefinitionListRef = useLatestRef(nodeDefinitionList);
  const getGroupChildrenRef = useLatestRef(getGroupChildren);
  const actionActionsRef = useLatestRef(actionActions);
  const interactionActionsRef = useLatestRef(interactionActions);
  const utilsRef = useLatestRef(utils);
  const matchesPointerActionRef = useLatestRef(matchesPointerAction);
  const contextMenuHandlerRef = useLatestRef(interactionSettings.contextMenu.handleRequest);

  const handleNodeContextMenu = React.useEffectEvent((event: React.MouseEvent, nodeId: string) => {
    const nativeEvent = event.nativeEvent as MouseEvent & { pointerType?: string };
    if (!matchesPointerActionRef.current("node-open-context-menu", nativeEvent)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const pointerType: PointerType | "unknown" =
      nativeEvent.pointerType === "mouse" || nativeEvent.pointerType === "touch" || nativeEvent.pointerType === "pen"
        ? (nativeEvent.pointerType as PointerType)
        : "unknown";

    const screenPosition = { x: event.clientX, y: event.clientY };
    const canvasPosition = utilsRef.current.screenToCanvas(event.clientX, event.clientY);

    const defaultShow = () => actionActionsRef.current.showContextMenu({ position: screenPosition, nodeId, canvasPosition });

    const handler = contextMenuHandlerRef.current;
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
  });

  const handleNodePointerDown = React.useEffectEvent(
    (event: React.PointerEvent, targetNodeId: string, isDragAllowed: boolean = true) => {
      const nativeEvent = event.nativeEvent;
      const matchesMultiSelect = matchesPointerActionRef.current("node-add-to-selection", nativeEvent);
      const matchesSelect = matchesPointerActionRef.current("node-select", nativeEvent) || matchesMultiSelect;

      if (!matchesSelect && !matchesMultiSelect) {
        return;
      }

      event.stopPropagation();
      const isInputElement =
        event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName);
      if (isInputElement) {
        return;
      }

      const nodes = getNodeEditorStateRef.current().nodes;
      const clickedNode = nodes[targetNodeId];
      const selectedNodeIds = actionStateRef.current.selectedNodeIds;
      const wasSelected = selectedNodeIds.includes(targetNodeId);
      const hadMultipleSelection = selectedNodeIds.length > 1;

      if (matchesMultiSelect) {
        actionActionsRef.current.selectEditingNode(targetNodeId, true);
        actionActionsRef.current.selectInteractionNode(targetNodeId, true);
        if (wasSelected) {
          return;
        }
      } else if (!wasSelected || !hadMultipleSelection) {
        actionActionsRef.current.selectEditingNode(targetNodeId, false);
        actionActionsRef.current.selectInteractionNode(targetNodeId, false);
      }

      if (clickedNode?.locked) {
        return;
      }

      const nodeDefinition = clickedNode ? nodeDefinitionRegistryRef.current.get(clickedNode.type) : undefined;
      const isInteractive = nodeDefinition?.interactive || false;

      if (isInteractive && !isDragAllowed && !wasSelected) {
        return;
      }

      const effectiveSelection = matchesMultiSelect
        ? addUniqueIds(selectedNodeIds, [targetNodeId])
        : wasSelected && hadMultipleSelection
          ? selectedNodeIds
          : [targetNodeId];

      const nodesToDrag = getNodesToDrag(
        targetNodeId,
        matchesMultiSelect,
        effectiveSelection,
        nodes,
        isInteractive,
        isDragAllowed,
      );

      if (nodesToDrag.length === 0) {
        return;
      }

      const startPosition = { x: event.clientX, y: event.clientY };
      const { initialPositions, affectedChildNodes } = collectInitialPositions(
        nodesToDrag,
        nodes,
        getGroupChildrenRef.current,
        nodeDefinitionListRef.current,
      );

      interactionActionsRef.current.startNodeDrag(nodesToDrag, startPosition, initialPositions, affectedChildNodes);
    },
  );

  return {
    handleNodePointerDown,
    handleNodeContextMenu,
  };
};
