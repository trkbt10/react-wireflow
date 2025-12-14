/**
 * @file Context for canvas-specific interaction states (selection box, drag, resize, connection drag)
 */
import * as React from "react";
import { createAction, type ActionUnion, type BoundActionCreators } from "../../../../utils/typedActions";
import { useExternalStoreSelector } from "../../../../hooks/useExternalStoreSelector";
import type {
  NodeId,
  ConnectionId,
  PortId,
  Position,
  Size,
  Port as BasePort,
  DragState,
  ResizeState,
  ResizeHandle,
  ConnectionDragState,
  ConnectionDisconnectState,
} from "../../../../types/core";

// Selection box for canvas range selection
export type SelectionBox = {
  start: Position;
  end: Position;
};

export type CanvasInteractionState = {
  selectionBox: SelectionBox | null;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  connectionDragState: ConnectionDragState | null;
  connectionDisconnectState: ConnectionDisconnectState | null;
};

export const canvasInteractionActions = {
  setSelectionBox: createAction("SET_SELECTION_BOX", (box: SelectionBox | null) => ({ box })),
  startNodeDrag: createAction(
    "START_NODE_DRAG",
    (
      nodeIds: NodeId[],
      startPosition: Position,
      initialPositions: Record<NodeId, Position>,
      affectedChildNodes: Record<NodeId, NodeId[]>,
    ) => ({ nodeIds, startPosition, initialPositions, affectedChildNodes }),
  ),
  updateNodeDrag: createAction("UPDATE_NODE_DRAG", (offset: Position) => ({ offset })),
  endNodeDrag: createAction("END_NODE_DRAG"),
  startConnectionDrag: createAction("START_CONNECTION_DRAG", (fromPort: BasePort) => ({ fromPort })),
  updateConnectionDrag: createAction(
    "UPDATE_CONNECTION_DRAG",
    (toPosition: Position, candidatePort: BasePort | null) => ({ toPosition, candidatePort }),
  ),
  endConnectionDrag: createAction("END_CONNECTION_DRAG"),
  startConnectionDisconnect: createAction(
    "START_CONNECTION_DISCONNECT",
    (
      originalConnection: {
        id: ConnectionId;
        fromNodeId: NodeId;
        fromPortId: PortId;
        toNodeId: NodeId;
        toPortId: PortId;
      },
      disconnectedEnd: "from" | "to",
      fixedPort: BasePort,
      draggingPosition: Position,
    ) => ({ originalConnection, disconnectedEnd, fixedPort, draggingPosition }),
  ),
  updateConnectionDisconnect: createAction(
    "UPDATE_CONNECTION_DISCONNECT",
    (draggingPosition: Position, candidatePort: BasePort | null) => ({
      draggingPosition,
      candidatePort,
    }),
  ),
  endConnectionDisconnect: createAction("END_CONNECTION_DISCONNECT"),
  startNodeResize: createAction(
    "START_NODE_RESIZE",
    (
      nodeId: NodeId,
      startPosition: Position,
      startSize: Size,
      handle: ResizeHandle,
      startNodePosition: Position,
    ) => ({
      nodeId,
      startPosition,
      startSize,
      handle,
      startNodePosition,
    }),
  ),
  updateNodeResize: createAction(
    "UPDATE_NODE_RESIZE",
    (currentSize: Size, currentPosition: Position) => ({ currentSize, currentPosition }),
  ),
  endNodeResize: createAction("END_NODE_RESIZE"),
} as const;

export type CanvasInteractionAction = ActionUnion<typeof canvasInteractionActions>;

// Context types
export type CanvasInteractionActionsValue = {
  dispatch: React.Dispatch<CanvasInteractionAction>;
  actions: BoundActionCreators<typeof canvasInteractionActions>;
  actionCreators: typeof canvasInteractionActions;
  getState: () => CanvasInteractionState;
  subscribe: (listener: () => void) => () => void;
};

export type CanvasInteractionContextValue = CanvasInteractionActionsValue & {
  state: CanvasInteractionState;
};

// Split contexts for performance optimization
const CanvasInteractionStateContext = React.createContext<CanvasInteractionState | null>(null);
CanvasInteractionStateContext.displayName = "CanvasInteractionStateContext";

const CanvasInteractionDragStateContext = React.createContext<DragState | null | undefined>(undefined);
CanvasInteractionDragStateContext.displayName = "CanvasInteractionDragStateContext";

export type ConnectionDragMeta = {
  fromPort: BasePort;
  candidatePortId: string | null;
  candidatePortNodeId: NodeId | null;
};

const CanvasInteractionConnectionDragMetaContext = React.createContext<ConnectionDragMeta | null | undefined>(undefined);
CanvasInteractionConnectionDragMetaContext.displayName = "CanvasInteractionConnectionDragMetaContext";

const CanvasInteractionResizeStateContext = React.createContext<ResizeState | null | undefined>(undefined);
CanvasInteractionResizeStateContext.displayName = "CanvasInteractionResizeStateContext";

const CanvasInteractionConnectionDisconnectActiveContext = React.createContext<boolean | undefined>(undefined);
CanvasInteractionConnectionDisconnectActiveContext.displayName = "CanvasInteractionConnectionDisconnectActiveContext";

const CanvasInteractionActionsContext = React.createContext<CanvasInteractionActionsValue | null>(null);
CanvasInteractionActionsContext.displayName = "CanvasInteractionActionsContext";

// Combined context for backward compatibility
export const CanvasInteractionContext = React.createContext<CanvasInteractionContextValue | null>(null);
CanvasInteractionContext.displayName = "CanvasInteractionContext";

// Hooks

/**
 * Hook to access only the canvas interaction state
 * Use this when you only need to read state and don't need actions
 */
export const useCanvasInteractionState = (): CanvasInteractionState => {
  const state = React.useContext(CanvasInteractionStateContext);
  if (!state) {
    throw new Error("useCanvasInteractionState must be used within a CanvasInteractionProvider");
  }
  return state;
};

export const useCanvasInteractionDragState = (): DragState | null => {
  const state = React.useContext(CanvasInteractionDragStateContext);
  if (state === undefined) {
    throw new Error("useCanvasInteractionDragState must be used within a CanvasInteractionProvider");
  }
  return state;
};

export const useCanvasInteractionConnectionDragMeta = (): ConnectionDragMeta | null => {
  const state = React.useContext(CanvasInteractionConnectionDragMetaContext);
  if (state === undefined) {
    throw new Error("useCanvasInteractionConnectionDragMeta must be used within a CanvasInteractionProvider");
  }
  return state;
};

export const useCanvasInteractionResizeState = (): ResizeState | null => {
  const state = React.useContext(CanvasInteractionResizeStateContext);
  if (state === undefined) {
    throw new Error("useCanvasInteractionResizeState must be used within a CanvasInteractionProvider");
  }
  return state;
};

export const useCanvasInteractionConnectionDisconnectActive = (): boolean => {
  const state = React.useContext(CanvasInteractionConnectionDisconnectActiveContext);
  if (state === undefined) {
    throw new Error(
      "useCanvasInteractionConnectionDisconnectActive must be used within a CanvasInteractionProvider",
    );
  }
  return state;
};

/**
 * Hook to access only the canvas interaction actions
 * Use this when you only need to dispatch actions and don't need to re-render on state changes
 * The returned actions have stable references and won't cause re-renders
 */
export const useCanvasInteractionActions = (): CanvasInteractionActionsValue => {
  const actions = React.useContext(CanvasInteractionActionsContext);
  if (!actions) {
    throw new Error("useCanvasInteractionActions must be used within a CanvasInteractionProvider");
  }
  return actions;
};

/**
 * Selects a derived value from the canvas interaction state without forcing consumers
 * to re-render for unrelated state changes.
 */
export function useCanvasInteractionSelector<T>(
  selector: (state: CanvasInteractionState) => T,
  options?: { areEqual?: (a: T, b: T) => boolean },
): T {
  const { subscribe, getState } = useCanvasInteractionActions();
  return useExternalStoreSelector(subscribe, getState, selector, options);
}

/**
 * Hook to access both state and actions
 * Prefer useCanvasInteractionState or useCanvasInteractionActions for better performance
 */
export const useCanvasInteraction = (): CanvasInteractionContextValue => {
  const context = React.useContext(CanvasInteractionContext);
  if (!context) {
    throw new Error("useCanvasInteraction must be used within a CanvasInteractionProvider");
  }
  return context;
};

// Export the split contexts for use in provider
export {
  CanvasInteractionStateContext,
  CanvasInteractionDragStateContext,
  CanvasInteractionConnectionDragMetaContext,
  CanvasInteractionResizeStateContext,
  CanvasInteractionConnectionDisconnectActiveContext,
  CanvasInteractionActionsContext,
};

// ============================================================================
// Derived State Hooks
// ============================================================================

/**
 * Returns memoized Sets for drag state lookup.
 * - directlyDraggedNodeIds: only the nodes being directly dragged
 * - affectedChildNodeIds: only the child nodes affected by group dragging
 * - allDraggedNodeIds: union of both (for connection rendering)
 */
export type DragNodeIdsSets = {
  directlyDraggedNodeIds: ReadonlySet<NodeId>;
  affectedChildNodeIds: ReadonlySet<NodeId>;
  allDraggedNodeIds: ReadonlySet<NodeId>;
};

export const useDragNodeIdsSets = (): DragNodeIdsSets | null => {
  const dragMembers = useCanvasInteractionSelector(
    (state) => {
      const drag = state.dragState;
      if (!drag) {
        return null;
      }
      return {
        nodeIds: drag.nodeIds,
        affectedChildNodes: drag.affectedChildNodes,
      };
    },
    {
      areEqual: (a, b) => {
        if (!a && !b) {
          return true;
        }
        if (!a || !b) {
          return false;
        }
        return a.nodeIds === b.nodeIds && a.affectedChildNodes === b.affectedChildNodes;
      },
    },
  );

  return React.useMemo(() => {
    if (!dragMembers) {
      return null;
    }
    const directlyDraggedNodeIds = new Set<NodeId>(dragMembers.nodeIds);
    const affectedChildNodeIds = new Set<NodeId>();
    for (const childIds of Object.values(dragMembers.affectedChildNodes)) {
      for (const id of childIds) {
        affectedChildNodeIds.add(id);
      }
    }
    const allDraggedNodeIds = new Set<NodeId>([...directlyDraggedNodeIds, ...affectedChildNodeIds]);
    return {
      directlyDraggedNodeIds,
      affectedChildNodeIds,
      allDraggedNodeIds,
    };
  }, [dragMembers]);
};

/**
 * Returns a memoized Set of all dragged node IDs (including affected children) for O(1) lookup.
 * Convenience hook for cases where you only need the combined set.
 * Returns null when no drag is in progress.
 */
export const useDraggedNodeIdsSet = (): ReadonlySet<NodeId> | null => {
  const sets = useDragNodeIdsSets();
  return sets?.allDraggedNodeIds ?? null;
};
