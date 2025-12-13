/**
 * @file Context for managing editor UI action states like selection, dragging, resizing, and context menus
 * Also provides centralized node operations (copy, paste, duplicate, delete, cut)
 */
import * as React from "react";
import {
  bindActionCreators,
  createAction,
  createActionHandlerMap,
  type ActionUnion,
  type BoundActionCreators,
} from "../../utils/typedActions";
import { NodeId, ConnectionId, Position, Port as BasePort, ContextMenuState } from "../../types/core";
import { useNodeEditor, useNodeEditorActions } from "./node-editor/context";
import { useNodeDefinitionList } from "../node-definitions/hooks/useNodeDefinitionList";
import { canAddNodeType, countNodesByType } from "../node-definitions/utils/nodeTypeLimits";
import {
  copyNodesToClipboard,
  pasteNodesFromClipboard,
} from "./node-editor/utils/nodeClipboardOperations";
import { useNodeCanvasUtils } from "./canvas/viewport/context";
import { buildNodeFromDefinition } from "./node-editor/utils/nodeFactory";
import { findConnectablePortDefinition } from "../../core/port/connectivity/connectability";

/**
 * Options for showing a context menu
 */
export type ShowContextMenuOptions = {
  position: Position;
  nodeId?: NodeId;
  canvasPosition?: Position;
  connectionId?: ConnectionId;
  mode?: "menu" | "search";
  allowedNodeTypes?: string[];
  fromPort?: BasePort;
};
import {
  createEmptyConnectablePorts,
  type ConnectablePortsResult,
} from "../../core/port/connectivity/connectableTypes";

export type EditorActionState = {
  selectedNodeIds: NodeId[];
  editingSelectedNodeIds: NodeId[];
  selectedConnectionIds: ConnectionId[];
  hoveredNodeId: NodeId | null;
  hoveredConnectionId: ConnectionId | null;
  hoveredPort: BasePort | null;
  connectedPorts: Set<string>;
  connectablePorts: ConnectablePortsResult;
  contextMenu: ContextMenuState;
  inspectorActiveTab: number;
};

export const editorActionStateActions = {
  selectInteractionNode: createAction("SELECT_INTERACTION_NODE", (nodeId: NodeId, multiple: boolean = false) => ({
    nodeId,
    multiple,
  })),
  setInteractionSelection: createAction("SET_INTERACTION_SELECTION", (nodeIds: NodeId[]) => ({ nodeIds })),
  clearInteractionSelection: createAction("CLEAR_INTERACTION_SELECTION"),
  selectEditingNode: createAction("SELECT_EDITING_NODE", (nodeId: NodeId, multiple: boolean = false) => ({
    nodeId,
    multiple,
  })),
  setEditingSelection: createAction("SET_EDITING_SELECTION", (nodeIds: NodeId[]) => ({ nodeIds })),
  clearEditingSelection: createAction("CLEAR_EDITING_SELECTION"),
  selectConnection: createAction("SELECT_CONNECTION", (connectionId: ConnectionId, multiple: boolean = false) => ({
    connectionId,
    multiple,
  })),
  clearSelection: createAction("CLEAR_SELECTION"),
  setHoveredNode: createAction("SET_HOVERED_NODE", (nodeId: NodeId | null) => ({ nodeId })),
  setHoveredConnection: createAction("SET_HOVERED_CONNECTION", (connectionId: ConnectionId | null) => ({
    connectionId,
  })),
  setHoveredPort: createAction("SET_HOVERED_PORT", (port: BasePort | null) => ({ port })),
  updateConnectedPorts: createAction("UPDATE_CONNECTED_PORTS", (connectedPorts: Set<string>) => ({ connectedPorts })),
  updateConnectablePorts: createAction("UPDATE_CONNECTABLE_PORTS", (connectablePorts: ConnectablePortsResult) => ({
    connectablePorts,
  })),
  showContextMenu: createAction("SHOW_CONTEXT_MENU", (options: ShowContextMenuOptions) => options),
  hideContextMenu: createAction("HIDE_CONTEXT_MENU"),
  setInspectorActiveTab: createAction("SET_INSPECTOR_ACTIVE_TAB", (index: number) => ({ index })),
} as const;

export type EditorActionStateAction = ActionUnion<typeof editorActionStateActions>;

const editorActionStateHandlers = createActionHandlerMap<EditorActionState, typeof editorActionStateActions>(
  editorActionStateActions,
  {
    selectInteractionNode: (state, action) => {
      const { nodeId, multiple } = action.payload;
      if (multiple) {
        const isSelected = state.selectedNodeIds.includes(nodeId);
        return {
          ...state,
          selectedNodeIds: isSelected
            ? state.selectedNodeIds.filter((id) => id !== nodeId)
            : [...state.selectedNodeIds, nodeId],
        };
      }
      return {
        ...state,
        selectedNodeIds: [nodeId],
        selectedConnectionIds: [],
      };
    },
    setInteractionSelection: (state, action) => ({
      ...state,
      selectedNodeIds: action.payload.nodeIds,
      selectedConnectionIds: [],
    }),
    clearInteractionSelection: (state) => ({
      ...state,
      selectedNodeIds: [],
      selectedConnectionIds: [],
    }),
    selectEditingNode: (state, action) => {
      const { nodeId, multiple } = action.payload;
      if (multiple) {
        const isSelected = state.editingSelectedNodeIds.includes(nodeId);
        return {
          ...state,
          editingSelectedNodeIds: isSelected
            ? state.editingSelectedNodeIds.filter((id) => id !== nodeId)
            : [...state.editingSelectedNodeIds, nodeId],
        };
      }
      return {
        ...state,
        editingSelectedNodeIds: [nodeId],
      };
    },
    setEditingSelection: (state, action) => ({
      ...state,
      editingSelectedNodeIds: action.payload.nodeIds,
    }),
    clearEditingSelection: (state) => ({
      ...state,
      editingSelectedNodeIds: [],
    }),
    selectConnection: (state, action) => {
      const { connectionId, multiple } = action.payload;
      if (multiple) {
        const isSelected = state.selectedConnectionIds.includes(connectionId);
        return {
          ...state,
          selectedConnectionIds: isSelected
            ? state.selectedConnectionIds.filter((id) => id !== connectionId)
            : [...state.selectedConnectionIds, connectionId],
        };
      }
      return {
        ...state,
        selectedConnectionIds: [connectionId],
        selectedNodeIds: [],
        editingSelectedNodeIds: [],
      };
    },
    clearSelection: (state) => ({
      ...state,
      selectedNodeIds: [],
      editingSelectedNodeIds: [],
      selectedConnectionIds: [],
      hoveredConnectionId: null,
      hoveredNodeId: null,
      hoveredPort: null,
    }),
    setHoveredNode: (state, action) => ({
      ...state,
      hoveredNodeId: action.payload.nodeId,
    }),
    setHoveredConnection: (state, action) => ({
      ...state,
      hoveredConnectionId: action.payload.connectionId,
    }),
    setHoveredPort: (state, action) => ({
      ...state,
      hoveredPort: action.payload.port,
    }),
    updateConnectedPorts: (state, action) => ({
      ...state,
      connectedPorts: action.payload.connectedPorts,
    }),
    updateConnectablePorts: (state, action) => ({
      ...state,
      connectablePorts: action.payload.connectablePorts,
    }),
    showContextMenu: (state, action) => ({
      ...state,
      contextMenu: {
        visible: true,
        position: action.payload.position,
        canvasPosition: action.payload.canvasPosition,
        nodeId: action.payload.nodeId,
        connectionId: action.payload.connectionId,
        mode: action.payload.mode ?? "menu",
        allowedNodeTypes: action.payload.allowedNodeTypes,
        fromPort: action.payload.fromPort,
      },
    }),
    hideContextMenu: (state) => ({
      ...state,
      contextMenu: {
        visible: false,
        position: { x: 0, y: 0 },
        canvasPosition: undefined,
        nodeId: undefined,
        connectionId: undefined,
      },
    }),
    setInspectorActiveTab: (state, action) => ({
      ...state,
      inspectorActiveTab: action.payload.index,
    }),
  },
);

// Editor action state reducer
export const editorActionStateReducer = (
  state: EditorActionState,
  action: EditorActionStateAction,
): EditorActionState => {
  const handler = editorActionStateHandlers[action.type];
  if (!handler) {
    return state;
  }
  return handler(state, action, undefined);
};

// Default state
export const defaultEditorActionState: EditorActionState = {
  selectedNodeIds: [],
  editingSelectedNodeIds: [],
  selectedConnectionIds: [],
  hoveredNodeId: null,
  hoveredConnectionId: null,
  hoveredPort: null,
  connectedPorts: new Set<string>(),
  connectablePorts: createEmptyConnectablePorts(),
  contextMenu: {
    visible: false,
    position: { x: 0, y: 0 },
    canvasPosition: undefined,
    nodeId: undefined,
    connectionId: undefined,
    mode: "menu",
    allowedNodeTypes: undefined,
    fromPort: undefined,
  },
  inspectorActiveTab: 0,
};

// Node operations type
export type NodeOperations = {
  /**
   * Duplicate nodes. If targetNodeId is in selection, duplicates all selected nodes.
   * Otherwise duplicates only the target node.
   */
  duplicateNodes: (targetNodeId?: string) => void;
  /**
   * Delete nodes. If targetNodeId is in selection, deletes all selected nodes.
   * Otherwise deletes only the target node.
   */
  deleteNodes: (targetNodeId?: string) => void;
  /**
   * Copy nodes to clipboard. If targetNodeId is in selection, copies all selected nodes.
   * Otherwise copies only the target node.
   */
  copyNodes: (targetNodeId?: string) => void;
  /**
   * Cut nodes (copy then delete). If targetNodeId is in selection, cuts all selected nodes.
   * Otherwise cuts only the target node.
   */
  cutNodes: (targetNodeId?: string) => void;
  /**
   * Paste nodes from clipboard and select them.
   */
  pasteNodes: () => void;
  /**
   * Create a node from context menu, optionally auto-connecting to a source port.
   * Handles position conversion, type limit checking, and connection creation.
   */
  createNodeFromContextMenu: (
    nodeType: string,
    screenPosition: Position,
  ) => void;
};

// Context types
export type EditorActionStateActionsValue = {
  dispatch: React.Dispatch<EditorActionStateAction>;
  actions: BoundActionCreators<typeof editorActionStateActions>;
  actionCreators: typeof editorActionStateActions;
  nodeOperations: NodeOperations;
};

export type EditorActionStateContextValue = EditorActionStateActionsValue & {
  state: EditorActionState;
};

// Split contexts for performance optimization
const EditorActionStateStateContext = React.createContext<EditorActionState | null>(null);
EditorActionStateStateContext.displayName = "EditorActionStateStateContext";

const EditorActionStateActionsContext = React.createContext<EditorActionStateActionsValue | null>(null);
EditorActionStateActionsContext.displayName = "EditorActionStateActionsContext";

// Combined context for backward compatibility
export const EditorActionStateContext = React.createContext<EditorActionStateContextValue | null>(null);
EditorActionStateContext.displayName = "EditorActionStateContext";

/**
 * Resolve target node IDs based on selection state.
 * If targetNodeId is provided and is in the current selection, returns all selected nodes.
 * Otherwise returns only the target node (or empty array if no target).
 */
function resolveTargetNodeIds(
  targetNodeId: string | undefined,
  selectedNodeIds: string[],
): string[] {
  if (!targetNodeId) {
    return selectedNodeIds.length > 0 ? selectedNodeIds : [];
  }
  const isInSelection = selectedNodeIds.includes(targetNodeId);
  if (isInSelection && selectedNodeIds.length > 0) {
    return selectedNodeIds;
  }
  return [targetNodeId];
}

// Provider
export type EditorActionStateProviderProps = {
  children: React.ReactNode;
  initialState?: Partial<EditorActionState>;
};

export const EditorActionStateProvider: React.FC<EditorActionStateProviderProps> = ({ children, initialState }) => {
  const [state, dispatch] = React.useReducer(editorActionStateReducer, {
    ...defaultEditorActionState,
    ...initialState,
  });
  const boundActions = React.useMemo(() => bindActionCreators(editorActionStateActions, dispatch), [dispatch]);

  // Access other contexts for node operations
  const { state: editorState } = useNodeEditor();
  const editorActions = useNodeEditorActions();
  const nodeDefinitions = useNodeDefinitionList();
  const canvasUtils = useNodeCanvasUtils();

  // Node operations
  const duplicateNodes = React.useCallback(
    (targetNodeId?: string) => {
      const nodeIds = resolveTargetNodeIds(targetNodeId, state.selectedNodeIds);
      if (nodeIds.length === 0) {
        return;
      }
      // Check if all nodes can be duplicated
      const counts = countNodesByType(editorState);
      const canDuplicateAll = nodeIds.every((nodeId) => {
        const node = editorState.nodes[nodeId];
        if (!node) {
          return false;
        }
        return canAddNodeType(node.type, nodeDefinitions, counts);
      });
      if (!canDuplicateAll) {
        return;
      }
      editorActions.duplicateNodes(nodeIds);
    },
    [state.selectedNodeIds, editorActions, editorState, nodeDefinitions],
  );

  const deleteNodes = React.useCallback(
    (targetNodeId?: string) => {
      const nodeIds = resolveTargetNodeIds(targetNodeId, state.selectedNodeIds);
      if (nodeIds.length === 0) {
        return;
      }
      nodeIds.forEach((nodeId) => editorActions.deleteNode(nodeId));
      boundActions.clearSelection();
    },
    [state.selectedNodeIds, editorActions, boundActions],
  );

  const copyNodes = React.useCallback(
    (targetNodeId?: string) => {
      const nodeIds = resolveTargetNodeIds(targetNodeId, state.selectedNodeIds);
      if (nodeIds.length === 0) {
        return;
      }
      copyNodesToClipboard(nodeIds, editorState);
    },
    [state.selectedNodeIds, editorState],
  );

  const cutNodes = React.useCallback(
    (targetNodeId?: string) => {
      const nodeIds = resolveTargetNodeIds(targetNodeId, state.selectedNodeIds);
      if (nodeIds.length === 0) {
        return;
      }
      copyNodesToClipboard(nodeIds, editorState);
      nodeIds.forEach((nodeId) => editorActions.deleteNode(nodeId));
      boundActions.clearSelection();
    },
    [state.selectedNodeIds, editorActions, editorState, boundActions],
  );

  const pasteNodes = React.useCallback(() => {
    const result = pasteNodesFromClipboard();
    if (!result) {
      return;
    }
    // Add nodes
    result.nodes.forEach((node) => {
      editorActions.addNodeWithId(node);
    });
    // Add connections
    result.connections.forEach((conn) => {
      editorActions.addConnection(conn);
    });
    // Select pasted nodes
    const newIds = Array.from(result.idMap.values());
    boundActions.setInteractionSelection(newIds);
    boundActions.setEditingSelection(newIds);
  }, [editorActions, boundActions]);

  const createNodeFromContextMenu = React.useCallback(
    (nodeType: string, screenPosition: Position) => {
      const nodeDefinition = nodeDefinitions.find((def) => def.type === nodeType);
      if (!nodeDefinition) {
        console.warn(`Node definition not found for type: ${nodeType}`);
        return;
      }

      // Use canvas position from context menu state (preferred)
      // If not available, use canvas utils to convert screen coordinates
      let canvasPosition = state.contextMenu.canvasPosition;

      if (!canvasPosition) {
        // Convert screen coordinates to canvas coordinates using canvas utils
        canvasPosition = canvasUtils.screenToCanvas(screenPosition.x, screenPosition.y);
      }

      // Enforce per-flow maximums if defined
      const counts = countNodesByType(editorState);
      if (!canAddNodeType(nodeType, nodeDefinitions, counts)) {
        return;
      }

      // Create new node with definition defaults
      const newNode = buildNodeFromDefinition({ nodeDefinition, canvasPosition });

      // Add node to editor with the predetermined id
      editorActions.addNodeWithId(newNode);

      // Do not auto-select the new node to avoid unintended adjacent highlighting

      // If creation was triggered from connection drag, try to connect
      const fromPort = state.contextMenu.fromPort;
      if (fromPort) {
        const fromNode = editorState.nodes[fromPort.nodeId];
        const fromDef = fromNode ? nodeDefinitions.find((d) => d.type === fromNode.type) : undefined;

        const connectableResult = findConnectablePortDefinition({
          fromPort,
          fromNodeDefinition: fromDef,
          targetNodeDefinition: nodeDefinition,
          targetNodeId: newNode.id,
          connections: editorState.connections,
          nodes: editorState.nodes,
        });

        if (connectableResult) {
          const { port: targetPort } = connectableResult;
          const connection =
            fromPort.type === "output"
              ? { fromNodeId: fromPort.nodeId, fromPortId: fromPort.id, toNodeId: newNode.id, toPortId: targetPort.id }
              : {
                  fromNodeId: newNode.id,
                  fromPortId: targetPort.id,
                  toNodeId: fromPort.nodeId,
                  toPortId: fromPort.id,
                };
          editorActions.addConnection(connection);
        }
      }

      // Hide context menu
      boundActions.hideContextMenu();
    },
    [
      nodeDefinitions,
      editorActions,
      boundActions,
      state.contextMenu.canvasPosition,
      state.contextMenu.fromPort,
      editorState.connections,
      editorState.nodes,
      canvasUtils,
    ],
  );

  const nodeOperations = React.useMemo<NodeOperations>(
    () => ({
      duplicateNodes,
      deleteNodes,
      copyNodes,
      cutNodes,
      pasteNodes,
      createNodeFromContextMenu,
    }),
    [duplicateNodes, deleteNodes, copyNodes, cutNodes, pasteNodes, createNodeFromContextMenu],
  );

  // Stable actions value - only depends on dispatch which is stable
  const actionsValue = React.useMemo<EditorActionStateActionsValue>(
    () => ({
      dispatch,
      actions: boundActions,
      actionCreators: editorActionStateActions,
      nodeOperations,
    }),
    [dispatch, boundActions, nodeOperations],
  );

  // Combined context value for backward compatibility
  const contextValue = React.useMemo<EditorActionStateContextValue>(
    () => ({
      state,
      ...actionsValue,
    }),
    [state, actionsValue],
  );

  return (
    <EditorActionStateStateContext.Provider value={state}>
      <EditorActionStateActionsContext.Provider value={actionsValue}>
        <EditorActionStateContext.Provider value={contextValue}>{children}</EditorActionStateContext.Provider>
      </EditorActionStateActionsContext.Provider>
    </EditorActionStateStateContext.Provider>
  );
};

// Hooks

/**
 * Hook to access both state and actions (backward compatible)
 * Prefer useEditorActionStateState or useEditorActionStateActions for better performance
 */
export const useEditorActionState = (): EditorActionStateContextValue => {
  const context = React.useContext(EditorActionStateContext);
  if (!context) {
    throw new Error("useEditorActionState must be used within an EditorActionStateProvider");
  }
  return context;
};

/**
 * Hook to access only the editor action state.
 * Prefer this in performance-sensitive render paths to avoid re-renders when only actions change.
 */
export const useEditorActionStateState = (): EditorActionState => {
  const state = React.useContext(EditorActionStateStateContext);
  if (!state) {
    throw new Error("useEditorActionStateState must be used within an EditorActionStateProvider");
  }
  return state;
};

/**
 * Hook to access only the editor action actions.
 * Prefer this when you only need to dispatch and don't want to re-render on state changes.
 */
export const useEditorActionStateActions = (): EditorActionStateActionsValue => {
  const actions = React.useContext(EditorActionStateActionsContext);
  if (!actions) {
    throw new Error("useEditorActionStateActions must be used within an EditorActionStateProvider");
  }
  return actions;
};

// ============================================================================
// Selection Set Hooks (O(1) lookup)
// ============================================================================

/**
 * Returns a memoized Set of selected node IDs for O(1) lookup.
 */
export const useSelectedNodeIdsSet = (): ReadonlySet<NodeId> => {
  const state = useEditorActionStateState();
  const { selectedNodeIds } = state;
  return React.useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
};

/**
 * Returns a memoized Set of selected connection IDs for O(1) lookup.
 */
export const useSelectedConnectionIdsSet = (): ReadonlySet<ConnectionId> => {
  const state = useEditorActionStateState();
  const { selectedConnectionIds } = state;
  return React.useMemo(() => new Set(selectedConnectionIds), [selectedConnectionIds]);
};
