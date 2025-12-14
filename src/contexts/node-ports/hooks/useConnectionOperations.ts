/**
 * @file Hook for connection operations (create, disconnect, complete).
 */
import * as React from "react";
import { useEditorActionState } from "../../composed/EditorActionStateContext";
import { useCanvasInteractionActions } from "../../composed/canvas/interaction/context";
import { useNodeDefinitions } from "../../node-definitions/context";
import { useNodeEditor } from "../../composed/node-editor/context";
import { createValidatedConnection } from "../../../core/connection/operations";
import {
  planConnectionChange,
  ConnectionSwitchBehavior,
} from "../../../core/port/connectivity/connectionPlanning";
import type { Port } from "../../../types/core";
import { EMPTY_CONNECTABLE_PORTS } from "../../../core/port/connectivity/connectableTypes";
import { useLatestRef } from "../../../hooks/useLatestRef";

export const useConnectionOperations = () => {
  const { state: _actionState, actions: actionActions } = useEditorActionState();
  const { actions: interactionActions, getState: getInteractionState } = useCanvasInteractionActions();
  const { state: nodeEditorState, actions: nodeEditorActions, getNodePorts } = useNodeEditor();
  const { registry } = useNodeDefinitions();

  const getInteractionStateRef = useLatestRef(getInteractionState);
  const nodeEditorStateRef = useLatestRef(nodeEditorState);
  const nodeEditorActionsRef = useLatestRef(nodeEditorActions);
  const getNodePortsRef = useLatestRef(getNodePorts);
  const registryRef = useLatestRef(registry);
  const interactionActionsRef = useLatestRef(interactionActions);
  const actionActionsRef = useLatestRef(actionActions);

  const completeDisconnectDrag = React.useCallback(
    (targetPort: Port): boolean => {
      const disconnectState = getInteractionStateRef.current().connectionDisconnectState;
      if (!disconnectState) {
        return false;
      }
      const fixedPort = disconnectState.fixedPort;

      // createValidatedConnection handles all validation internally:
      // - port normalization
      // - same-type/same-node checks
      // - validateConnection callbacks
      // - data type compatibility
      // - capacity limits
      const newConnection = createValidatedConnection(
        fixedPort,
        targetPort,
        nodeEditorStateRef.current.nodes,
        nodeEditorStateRef.current.connections,
        (type: string) => registryRef.current.get(type),
      );
      if (!newConnection) {
        return false;
      }
      nodeEditorActionsRef.current.addConnection(newConnection);
      return true;
    },
    [],
  );

  const completeConnectionDrag = React.useCallback(
    (targetPort: Port): boolean => {
      const drag = getInteractionStateRef.current().connectionDragState;
      if (!drag) {
        return false;
      }
      const resolveCurrentPort = (port: Port): Port => {
        const current = getNodePortsRef.current(port.nodeId).find((candidate) => candidate.id === port.id);
        return current ?? port;
      };

      const fromPort = resolveCurrentPort(drag.fromPort);
      const toPort = resolveCurrentPort(targetPort);
      const plan = planConnectionChange({
        fromPort,
        toPort,
        nodes: nodeEditorStateRef.current.nodes,
        connections: nodeEditorStateRef.current.connections,
        getNodeDefinition: (type: string) => registryRef.current.get(type),
      });

      switch (plan.behavior) {
        case ConnectionSwitchBehavior.Append:
          if (plan.connection) {
            nodeEditorActionsRef.current.addConnection(plan.connection);
            return true;
          }
          break;
        case ConnectionSwitchBehavior.Ignore:
        default:
          break;
      }

      const fallbackConnection = createValidatedConnection(
        fromPort,
        toPort,
        nodeEditorStateRef.current.nodes,
        nodeEditorStateRef.current.connections,
        (type: string) => registryRef.current.get(type),
      );

      if (fallbackConnection) {
        nodeEditorActionsRef.current.addConnection(fallbackConnection);
        return true;
      }

      return false;
    },
    [],
  );

  const endConnectionDrag = React.useCallback(() => {
    interactionActionsRef.current.endConnectionDrag();
    actionActionsRef.current.setHoveredPort(null);
    actionActionsRef.current.updateConnectablePorts(EMPTY_CONNECTABLE_PORTS);
  }, []);

  const endConnectionDisconnect = React.useCallback(() => {
    interactionActionsRef.current.endConnectionDisconnect();
    actionActionsRef.current.setHoveredPort(null);
    actionActionsRef.current.updateConnectablePorts(EMPTY_CONNECTABLE_PORTS);
  }, []);

  return { completeConnectionDrag, completeDisconnectDrag, endConnectionDrag, endConnectionDisconnect };
};
